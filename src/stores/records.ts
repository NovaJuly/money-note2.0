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
// 必须按用户隔离：否则换账号后会读到上一位用户的账单缓存，
// 并用新账号的 token 把上一位用户的待同步队列推到服务端
const STORE_PREFIX = "moneyNoteRecords";
const QUEUE_PREFIX = "pendingActions";

let recordsLocal = localforage.createInstance({ name: STORE_PREFIX });
let pendingActionsLocal = localforage.createInstance({ name: QUEUE_PREFIX });

let currentTenant = "";

/**
 * 切换本地存储的归属用户
 * @param username 当前登录用户名；传空字符串表示未登录
 */
function setTenant(username: string) {
  const tenant = username || "";
  if (tenant === currentTenant) return;
  currentTenant = tenant;
  const suffix = tenant ? `-${tenant}` : "";
  recordsLocal = localforage.createInstance({
    name: `${STORE_PREFIX}${suffix}`,
  });
  pendingActionsLocal = localforage.createInstance({
    name: `${QUEUE_PREFIX}${suffix}`,
  });
}

// ---------- 类型 ----------
export interface BillRecord {
  id: string; // 统一为字符串
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note: string;
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
  const page = ref(0);
  const total = ref(0);
  const pageSize = ref(20);
  const hasMore = ref(true);

  // ---------- 初始化：从本地 IndexedDB 恢复记录 ----------
  async function initLocalData(username = "") {
    setTenant(username);

    let cached = await recordsLocal.getItem<BillRecord[]>("records");

    // 兼容旧版本：数据曾全部放在未分桶的实例里。
    // 首次切换到分桶存储时，把旧桶里的数据迁移过来，避免用户本地账单"凭空消失"
    if ((!cached || cached.length === 0) && currentTenant) {
      const legacyStore = localforage.createInstance({ name: STORE_PREFIX });
      const legacyRecords = await legacyStore.getItem<BillRecord[]>("records");
      if (legacyRecords && legacyRecords.length > 0) {
        await recordsLocal.setItem("records", legacyRecords);
        cached = legacyRecords;

        const legacyQueue = localforage.createInstance({ name: QUEUE_PREFIX });
        const legacyActions =
          await legacyQueue.getItem<PendingAction[]>("queue");
        if (legacyActions && legacyActions.length > 0) {
          await pendingActionsLocal.setItem("queue", legacyActions);
        }
        // 迁移完成后清掉旧桶，防止下次被另一个账号再次迁移
        await legacyStore.clear();
        await legacyQueue.clear();
      }
    }

    if (cached) records.value = cached;
  }

  /**
   * 清空内存中的记录状态（退出登录时调用）
   * 注意：这里刻意不清 IndexedDB —— 本地缓存已按用户隔离，
   * 保留它才能在离线状态下继续查看账单
   */
  function resetState() {
    records.value = [];
    page.value = 0;
    total.value = 0;
    hasMore.value = true;
    loading.value = false;
    setTenant("");
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
    await pendingActionsLocal.setItem(
      "queue",
      queue.map((q) => ({ ...toRaw(q) })),
    );
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
  async function addRecord(record: Omit<BillRecord, "id" | "synced">) {
    const tempId = nanoid();
    const newRecord: BillRecord = {
      ...record,
      id: tempId,
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
          const target = idx !== -1 ? records.value[idx] : undefined;
          if (target) {
            // 替换为服务器ID
            target.id = String(res.data.id);
            target.synced = true;
            await persistRecords();
          }
        } else {
          ElMessage.error(res.message || "添加失败");
          // 业务失败同样要入队：否则这条记录会永远停在本地，且没有任何重试路径
          await addPendingAction({ type: "create", payload: record, tempId });
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
    // 只剔除不可变的 id 与内部字段 synced；date 属于可修改字段，必须传递
    const { id: _, synced: ___, ...safeChanges } = changes as any;
    Object.assign(record, safeChanges);
    if (!record.synced) {
      // 未同步记录：队列里那条 create 的 payload 是快照，必须一起更新，
      // 否则同步上去的仍然是本次编辑之前的旧值
      const queue = await getPendingActions();
      const pending = queue.find(
        (a) => a.type === "create" && a.tempId === id,
      );
      if (pending) {
        pending.payload = { ...pending.payload, ...safeChanges };
        await saveQueue(queue);
      }
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
          payload: { id, changes: safeChanges },
        });
      }
    } else {
      await addPendingAction({
        type: "update",
        payload: { id, changes: safeChanges },
      });
    }
  }

  /**
   * 分页拉取记录，按页追加并保留本地未同步数据
   */
  async function fetchFromServer(
    options: {
      page?: number;
      limit?: number;
      replace?: boolean;
    } = {},
  ) {
    const nextPage = options.page ?? page.value + 1;
    const nextLimit = options.limit ?? pageSize.value;
    const shouldReplace = options.replace ?? nextPage === 1;

    if (loading.value) return;
    loading.value = true;

    try {
      const res = await recordsApi.fetchRecordsPage({
        page: nextPage,
        limit: nextLimit,
      });

      if (res.code !== 10000) return;

      const payload = res.data as any;

      // 后端返回 { list, total } 才说明支持分页；
      // 直接返回数组意味着它一次性给了全量，此时前端传的 page/limit 是没有意义的
      const isPaged = !Array.isArray(payload) && Array.isArray(payload?.list);
      const serverList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.list)
          ? payload.list
          : [];

      const serverRecords: BillRecord[] = serverList.map((r: any) => ({
        ...r,
        id: String(r.id),
        synced: true,
      }));

      const localUnsynced = records.value.filter((r) => !r.synced);
      const merged = shouldReplace
        ? serverRecords
        : [...records.value, ...serverRecords];

      const uniqueRecords = Array.from(
        new Map(
          [...localUnsynced, ...merged].map((record) => [record.id, record]),
        ).values(),
      ).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

      records.value = uniqueRecords;
      page.value = nextPage;
      // 未分页时本次返回即全量，不能拿结果长度当 total 去推算"是否还有更多"
      total.value = isPaged
        ? Number(payload?.total ?? uniqueRecords.length)
        : uniqueRecords.length;
      pageSize.value = nextLimit;
      hasMore.value = isPaged ? records.value.length < total.value : false;
      await persistRecords();
    } catch (e) {
      console.warn("拉取服务器记录失败", e);
    } finally {
      loading.value = false;
    }
  }

  // ---------- 计算属性 ----------
  const groupedRecords = computed(() => {
    const groups: Record<string, BillRecord[]> = {};
    // 按 date 数字时间戳倒序排列
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
    page,
    total,
    pageSize,
    hasMore,
    addRecord,
    deleteRecord,
    updateRecord,
    initLocalData,
    setTenant,
    resetState,
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
