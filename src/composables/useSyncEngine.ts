import { watch, onMounted, onUnmounted } from "vue";
import { isBackendOnline } from "./useServerStatus";
import { useRecordsStore } from "@/stores/records";
import * as recordsApi from "@/api/record";

let syncing = false;

export function useSyncEngine() {
  const recordsStore = useRecordsStore();

  const sync = async () => {
    if (syncing || !isBackendOnline.value) return;
    syncing = true;

    try {
      const queue = await recordsStore.getPendingActions();
      if (!queue || queue.length === 0) {
        syncing = false;
        return;
      }

      for (const action of queue) {
        try {
          switch (action.type) {
            case "create": {
              // 注意：payload 是原始 record 对象，不包含 id/createdAt
              const res = await recordsApi.createRecord(action.payload);
              if (res.code === 10000 && action.tempId) {
                // 替换临时 ID，标记已同步
                const records = recordsStore.records;
                const idx = records.findIndex((r) => r.id === action.tempId);
                if (idx !== -1) {
                  const target = records[idx];
                  if (target) {
                    target.id = String(res.data.id);
                    target.synced = true;
                    await recordsStore.persistRecords();
                  }
                }
              } else {
                // 业务错误，跳过并记录日志
                console.warn("同步创建失败", res.message);
              }
              break;
            }
            case "update": {
              await recordsApi.updateRecord(
                action.payload.id,
                action.payload.changes,
              );
              // 更新成功，标记本地记录为已同步
              const record = recordsStore.records.find(
                (r) => r.id === action.payload.id,
              );
              if (record) {
                record.synced = true;
                await recordsStore.persistRecords();
              }
              break;
            }
            case "delete": {
              await recordsApi.deleteRecord(action.payload.id);
              break;
            }
          }
          // 成功处理后从队列移除
          await recordsStore.removePendingAction(action.id);
        } catch (err) {
          console.error("同步操作异常", action, err);
          // 网络错误或其他，退出循环，等待下次同步
          break;
        }
      }
    } finally {
      syncing = false;
    }
  };

  // 监听在线状态变化
  watch(isBackendOnline, (online) => {
    if (online) sync();
  });

  // 页面可见时触发同步
  const handleVisibility = () => {
    if (document.visibilityState === "visible" && isBackendOnline.value) {
      sync();
    }
  };
  // 浏览器报告网络恢复时同步
  const handleOnline = () => {
    if (isBackendOnline.value) sync();
  };

  onMounted(() => {
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    // 启动后尝试一次同步
    if (isBackendOnline.value) sync();
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("online", handleOnline);
  });

  return { sync };
}
