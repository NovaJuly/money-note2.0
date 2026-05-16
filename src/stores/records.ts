import { defineStore } from "pinia";
import { ref, computed, toRaw } from "vue";
import dayjs from "dayjs";
import localforage from "localforage";
import { nanoid } from "nanoid";
import * as recordsApi from "@/api/record";
import { ElMessage } from "element-plus";

// 共享的在线状态（由 useServerStatus 管理）
import { isBackendOnline } from "@/composables/useServerStatus";

// ---------- 本地存储实例 ----------
const recordsLocal = localforage.createInstance({ name: "moneyNoteRecords" });
const pendingActionsLocal = localforage.createInstance({
  name: "pendingActions",
});

// ---------- 类型 ----------
export interface BillRecord {
  id: string; // 统一为字符串
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note: string;
  createdAt: string;
  synced: boolean; // 是否已与服务器同步
}

export interface PendingAction {
  id: string;
  type: "create" | "update" | "delete";
  payload: any;
  tempId?: string; // 新建记录时的临时ID
  timestamp: number;
}

export const useRecordsStore = defineStore("records", () => {
  // ---------- 状态 ----------
  const records = ref<BillRecord[]>([]);
  const loading = ref(false);

  // ---------- 初始化：从本地 IndexedDB 恢复记录 ----------
  async function initLocalData() {
    const cached = await recordsLocal.getItem<BillRecord[]>("records");
    if (cached) records.value = cached;
  }

  // ---------- 本地持久化辅助方法 ----------
  async function persistRecords() {
    const plainRecords = records.value.map((r) => ({ ...toRaw(r) }));
    await recordsLocal.setItem("records", plainRecords);
  }

  // ---------- 离线队列管理 ----------
  async function getPendingActions(): Promise<PendingAction[]> {
    return (await pendingActionsLocal.getItem<PendingAction[]>("queue")) || [];
  }

  async function saveQueue(queue: PendingAction[]) {
    await pendingActionsLocal.setItem('queue', queue.map(q => ({ ...toRaw(q) })))
  }

  async function addPendingAction(
    action: Omit<PendingAction, "id" | "timestamp">,
  ) {
    const queue = await getPendingActions();
    queue.push({ ...action, id: nanoid(), timestamp: Date.now() });
    await saveQueue(queue);
  }

  async function removePendingAction(actionId: string) {
    const queue = await getPendingActions();
    const newQueue = queue.filter((a) => a.id !== actionId);
    await saveQueue(newQueue);
  }

  // ---------- 记账记录操作 ----------

  /**
   * 添加记录 (离线优先)
   */
  async function addRecord(record: Omit<BillRecord, "id" | "synced" | "createdAt">) {
    const tempId = nanoid();
    const newRecord: BillRecord = {
      ...record,
      id: tempId,
      createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      synced: false,
    };

    // 1. 立即更新本地数据
    records.value.unshift(newRecord);
    await persistRecords();

    // 2. 如果在线，尝试调用后端；否则/失败则加入离线队列
    if (isBackendOnline.value) {
      try {
        const res = await recordsApi.createRecord(record);
        if (res.code === 10000) {
          const idx = records.value.findIndex((r) => r.id === tempId);
          if (idx !== -1) {
            const record = records.value[idx];
            if (record) {
              // 替换为服务器ID
              record.id = String(res.data.id);
              record.synced = true;
              await persistRecords();
            }
            await persistRecords();
          }
        } else {
          ElMessage.error(res.message || "添加失败");
        }
      } catch {
        // 网络错误，加入待同步队列
        await addPendingAction({ type: "create", payload: record, tempId });
      }
    } else {
      // 离线状态，直接入队
      await addPendingAction({ type: "create", payload: record, tempId });
    }
  }

  /**
   * 删除记录
   */
  async function deleteRecord(id: string) {
    const record = records.value.find((r) => r.id === id);
    if (!record) return;

    // 乐观删除本地
    records.value = records.value.filter((r) => r.id !== id);
    await persistRecords();

    // 如果是纯本地记录且未同步，直接删除即可
    if (!record.synced) {
      // 删除离线队列中针对此临时ID的 create 操作（如果存在）
      const queue = await getPendingActions();
      const filteredQueue = queue.filter((a) => !(a.tempId === id));
      await saveQueue(filteredQueue);
      // 无后端操作，直接结束
      return;
    }

    if (isBackendOnline.value) {
      try {
        await recordsApi.deleteRecord(id);
      } catch {
        await addPendingAction({ type: "delete", payload: { id } });
      }
    } else {
      await addPendingAction({ type: "delete", payload: { id } });
    }
  }

  /**
   * 更新记录
   */
  async function updateRecord(id: string, changes: Partial<BillRecord>) {
    const record = records.value.find((r) => r.id === id);
    if (!record) return;

    // 乐观更新本地
    const { id: _, date: __, synced: ___, ...safeChanges } = changes as any;
    Object.assign(record, safeChanges);
    if (!record.synced) {
      // 未同步的记录仅更新本地，等 create 同步上去时自然包含最新数据
      await persistRecords();
      return;
    }
    record.synced = false;
    await persistRecords();

    if (isBackendOnline.value) {
      try {
        await recordsApi.updateRecord(id, safeChanges);
        record.synced = true;
        await persistRecords();
      } catch {
        await addPendingAction({
          type: "update",
          payload: { id, safeChanges },
        });
      }
    } else {
      await addPendingAction({
        type: "update",
        payload: { id, safeChanges },
      });
    }
  }

  /**
   * 从服务器拉取全量记录并合并（保留未同步的本地记录）
   */
  async function fetchFromServer() {
    try {
      const res = await recordsApi.fetchRecords();
      if (res.code === 10000) {
        const serverRecords: BillRecord[] = res.data.map((r: any) => ({
          ...r,
          id: String(r.id),
          createdAt: dayjs(r.createAt).valueOf(),
          synced: true,
        }));
        // 保留本地尚未同步的记录，它们还没上传
        // const localUnsynced = records.value.filter(r => !r.synced)
        records.value = serverRecords;
        await persistRecords();
      }
    } catch (e) {
      console.warn("拉取服务器记录失败", e);
    }
  }

  // ---------- 计算属性 ----------
  const groupedRecords = computed(() => {
    const groups: Record<string, BillRecord[]> = {};
    // 按 createdAt 数字时间戳倒序排列
    const sorted = [...records.value].sort((a, b) => {
      const timeA =
        typeof a.date === "number" ? a.date : dayjs(a.date).valueOf();
      const timeB =
        typeof b.date === "number" ? b.date : dayjs(b.date).valueOf();
      return timeB - timeA;
    });
    sorted.forEach((record) => {
      const dateKey = dayjs(record.date).format("YYYY-MM-DD");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(record);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  });
  const currentMonthRecords = computed(() => {
    const now = dayjs();
    return records.value.filter((r) => dayjs(r.date).isSame(now, "month"));
  });

  const monthlyIncome = computed(() =>
    currentMonthRecords.value
      .filter((r) => r.type === "income")
      .reduce((sum, r) => sum + r.amount, 0),
  );

  const monthlyExpense = computed(() =>
    currentMonthRecords.value
      .filter((r) => r.type === "expense")
      .reduce((sum, r) => sum + r.amount, 0),
  );

  const todayExpense = computed(() => {
    const today = dayjs().format("YYYY-MM-DD");
    return records.value
      .filter(
        (r) =>
          dayjs(r.date).format("YYYY-MM-DD") === today && r.type === "expense",
      )
      .reduce((sum, r) => sum + r.amount, 0);
  });

  // ---------- 导出 ----------
  return {
    records,
    loading,
    addRecord,
    deleteRecord,
    updateRecord,
    initLocalData,
    fetchFromServer,
    getPendingActions,
    removePendingAction,
    persistRecords,
    // 计算属性
    groupedRecords,
    currentMonthRecords,
    monthlyIncome,
    monthlyExpense,
    todayExpense,
  };
});
