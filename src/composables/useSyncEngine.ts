import { watch, onMounted, onUnmounted } from "vue";
import axios from "axios";
import { isBackendOnline } from "./useServerStatus";
import { useRecordsStore } from "@/stores/records";
import * as recordsApi from "@/api/record";
import { useUserStore } from "@/stores/user";
import { ElMessage } from "element-plus";

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

      let failed = 0;

      for (const action of queue) {
        let ok = false;
        try {
          switch (action.type) {
            case "create": {
              // 注意：payload 是原始 record 对象，不包含 id
              const res = await recordsApi.createRecord(action.payload);
              if (res?.code === 10000 && action.tempId) {
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
                ok = true;
              } else {
                // 业务失败：保留在队列里等待重试，绝不能丢弃
                console.warn("同步创建失败", res?.message);
              }
              break;
            }
            case "update": {
              // 兼容历史上写入队列的 safeChanges 字段名
              const changes =
                action.payload.changes ?? action.payload.safeChanges;
              const res = await recordsApi.updateRecord(
                action.payload.id,
                changes,
              );
              if (res?.code === 10000) {
                // 更新成功，标记本地记录为已同步
                const record = recordsStore.records.find(
                  (r) => r.id === action.payload.id,
                );
                if (record) {
                  record.synced = true;
                  await recordsStore.persistRecords();
                }
                ok = true;
              } else {
                console.warn("同步更新失败", res?.message);
              }
              break;
            }
            case "delete": {
              const res = await recordsApi.deleteRecord(action.payload.id);
              if (res?.code === 10000) {
                ok = true;
              } else {
                console.warn("同步删除失败", res?.message);
              }
              break;
            }
          }
        } catch (err) {
          console.error("同步操作异常", action, err);
          // 网络不可达：队列中其余动作必然也会失败，中断本轮，等下次同步
          if (axios.isAxiosError(err)) {
            syncing = false;
            return;
          }
          // 服务器返回的错误：仅跳过当前动作，继续处理其余动作，避免被单条卡死
        }

        if (ok) {
          // 只有确认成功才从队列移除，失败项保留等待重试
          await recordsStore.removePendingAction(action.id);
        } else {
          failed++;
        }
      }

      // 有失败项时明确告知用户，避免静默丢失
      if (failed > 0) {
        ElMessage.warning(`${failed} 条记录同步失败，将稍后重试`);
      }
    } finally {
      syncing = false;
    }
  };

  
  // 监听在线状态变化
  watch(isBackendOnline, async(online) => {
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
export function useAutoRelogin() {
  const userStore = useUserStore()

  watch(isBackendOnline, async (online) => {
    if (!online) return
    if (!userStore.token?.startsWith('token-local-')) return

    const cred = userStore.offlineCredentials // 需在 store 中暴露
    if (!cred) {
      ElMessage.warning('服务器已恢复，请手动重新登录以同步数据')
      return
    }

    try {
      const res = await userStore.login(cred.username, cred.password)
      if (res.success) {
        ElMessage.success('已自动重新登录，开始同步离线数据')
        // 清除临时凭证
        userStore.offlineCredentials=null
        // 手动触发同步（或由 syncEngine 的 watch 自动触发）
      } else {
        ElMessage.error('自动登录失败，请手动登录')
      }
    } catch {
      ElMessage.error('自动登录失败，请手动登录')
    }
  })
}
