import dayjs from "dayjs";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import * as categoriesApi from "@/api/categories";
import { ElMessage } from "element-plus";
import * as recordsApi from "@/api/record";

// 记账记录类型
export interface BillRecord {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note: string;
  createdAt: string;
}

// 预设分类
export interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  type: "expense" | "income";
}

export const EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 1, name: "餐饮", icon: "Food", type: "expense" },
  { id: 2, name: "交通", icon: "Place", type: "expense" },
  { id: 3, name: "购物", icon: "ShoppingCart", type: "expense" },
  { id: 4, name: "住房", icon: "House", type: "expense" },
  { id: 5, name: "娱乐", icon: "SwitchFilled", type: "expense" },
  { id: 6, name: "医疗", icon: "Help", type: "expense" },
  { id: 7, name: "教育", icon: "School", type: "expense" },
  { id: 8, name: "转账", icon: "Present", type: "expense" },
  { id: 9, name: "通讯", icon: "PhoneFilled", type: "expense" },
  {
    id: 10,
    name: "其他",
    icon: "More",
    type: "expense",
  },
];

// 默认收入分类
export const INCOME_CATEGORIES: CategoryItem[] = [
  { id: 11, name: "工资", icon: "Money", type: "income" },
  { id: 12, name: "转账", icon: "Present", type: "income" },
  { id: 13, name: "理财", icon: "TrendCharts", type: "income" },
  { id: 14, name: "退款", icon: "Wallet", type: "income" },
  { id: 15, name: "其他", icon: "More", type: "income" },
];
export const useRecordsStore = defineStore(
  "records",
  () => {
    // 状态
    const records = ref<BillRecord[]>([]);

    // 数据
    // 总收入
    const totalIncome = computed(() => {
      return records.value
        .filter((record) => record.type === "income")
        .reduce((sum, record) => sum + record.amount, 0);
    });
    // 总支出
    const totalExpense = computed(() => {
      return records.value
        .filter((record) => record.type === "expense")
        .reduce((sum, record) => sum + (record.amount || 0), 0);
    });
    // 当月记录
    const currentMonthRecords = computed(() => {
      const now = dayjs();
      return records.value.filter((record) =>
        dayjs(record.date).isSame(now, "month"),
      );
    });

    // 当月总收入
    const monthlyIncome = computed(() => {
      return currentMonthRecords.value
        .filter((record) => record.type === "income")
        .reduce((sum, record) => sum + record.amount, 0);
    });

    // 当月总支出
    const monthlyExpense = computed(() => {
      return currentMonthRecords.value
        .filter((record) => record.type === "expense")
        .reduce((sum, record) => sum + (record.amount || 0), 0);
    });

    // 今日支出
    const todayExpense = computed(() => {
      const today = dayjs().format("YYYY-MM-DD");
      return records.value
        .filter((record) => record.date === today && record.type === "expense")
        .reduce((sum, record) => sum + (record.amount || 0), 0);
    });

    // 当月结余
    const monthlyBalance = computed(() => {
      return monthlyIncome.value - monthlyExpense.value;
    });

    // 按日期分组的记录（用于流水列表）
    const groupedRecords = computed(() => {
      const groups: Record<string, BillRecord[]> = {};
      // 过滤掉没有 date 的记录（安全处理）
      const valid = records.value.filter((r) => r && r.date);

      // 按 date 倒序排列
      const sorted = [...valid].sort((a, b) => b.date.localeCompare(a.date));

      sorted.forEach((record) => {
        groups[record.date] = groups[record.date] || [];
        groups[record.date]!.push(record);
      });
      // 返回 [date, records][] 数组，并按日期倒序排列
      return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    });

    // 方法
    // 添加记录
    const addRecord = async (record: Omit<BillRecord, "id" | "createdAt">) => {
      console.log(record);
      // 金额强校验，防止非法字符串进入
      const amount = Number(record.amount);
      if (!isFinite(amount) || amount < 0) {
        console.error("无效金额，拒绝添加", record.amount);
        return;
      }
      // 构建请求体
      const payload = {
        ...record,
        amount,
        note: record.note || "",
        createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      };
      // 使用展开运算符确保触发响应式更新
      // 调用API添加记录
      try {
        const res = await recordsApi.createRecord(payload);
        console.log(res);

        if (res.code === 10000) {
          records.value.unshift(res.data);
          ElMessage.success("添加成功");
        } else {
          ElMessage.error(res.message || "添加失败");
        }
      } catch (e: any) {
        console.error("添加记录失败", e);
        ElMessage.error(e.message || "添加记录失败");
      }
    };
    // 获取所有记录
    const loadRecords = async () => {
      try {
        const res = await recordsApi.fetchRecords();
        if (res.code === 10000) {
          records.value = res.data;
        } else {
          ElMessage.error(res.message || "获取记录失败");
        }
      } catch (e: any) {
        console.error("获取记录失败", e);
        ElMessage.error(e.message || "获取记录失败");
      }
    };
    // 删除记录
    const deleteRecord = async (id: number) => {
      const index = records.value.findIndex((record) => record.id === id);
      if (index !== -1) {
        try {
          const res = await recordsApi.deleteRecord(id);
          if (res.code === 10000) {
            records.value.splice(index, 1);
            ElMessage.success("删除成功");
          } else {
            ElMessage.error(res.message || "删除失败");
          }
        } catch (e: any) {
          console.error("删除记录失败", e);
          ElMessage.error(e.message || "删除记录失败");
        }
      }
    };
    // 更新记录
    const updateRecord = async (id: number, updates: Partial<BillRecord>) => {
      const record = records.value.find((record) => record.id === id);
      if (record) {
        // 金额校验
        if (updates.amount !== undefined) {
          const amount = Number(updates.amount);
          if (!isFinite(amount) || amount < 0) {
            console.error("无效金额，拒绝更新", updates.amount);
            return;
          }
        }
        try {
          const res = await recordsApi.updateRecord(id, updates);
          if (res.code === 10000) {
            Object.assign(record, updates);
            ElMessage.success("更新成功");
          } else {
            ElMessage.error(res.message || "更新失败");
          }
        } catch (e: any) {
          console.error("更新记录失败", e);
          ElMessage.error(e.message || "更新记录失败");
        }
      }
    };

    // ---- 分类状态 ----
    const expenseCategories = ref<CategoryItem[]>([...EXPENSE_CATEGORIES]);
    const incomeCategories = ref<CategoryItem[]>([...INCOME_CATEGORIES]);
    const categoriesLoaded = ref(false);

    const loadCategories = async () => {
      let res;
      try {
        res = await categoriesApi.fetchCategories();
        console.log(res);

        if (res.code === 10000) {
          const all = res.data.filter((c) => c && c.name);
          const exps = all.filter((c) => c.type === "expense");
          const incs = all.filter((c) => c.type === "income");
          if (exps.length > 0) {
            expenseCategories.value = exps;
          }
          if (incs.length > 0) {
            incomeCategories.value = incs;
          }
          categoriesLoaded.value = true;
        }
      } catch (e) {
        console.log(res);
        console.warn("加载分类失败，可降级使用缓存", e);
      }
    };

    // 添加分类（调用后端接口，成功后刷新）
    const addCategory = async (
      type: "expense" | "income",
      name: string,
      icon: string = "MoreFilled",
    ) => {
      try {
        await categoriesApi.createCategory({ name, icon, type });
        await loadCategories(); // 重新拉取最新列表
        console.log();
      } catch (error: any) {
        ElMessage.error(error.message || "添加失败");
      }
    };
    // 删除分类
    const deleteCategory = async (id: number) => {
      try {
        await categoriesApi.deleteCategory(id);
        await loadCategories();
        ElMessage.success("删除成功");
      } catch (error: any) {
        ElMessage.error(error.message || "删除失败");
      }
    };

    return {
      records,
      currentMonthRecords,
      totalIncome,
      totalExpense,
      monthlyIncome,
      monthlyExpense,
      todayExpense,
      monthlyBalance,
      groupedRecords,
      addRecord,
      deleteRecord,
      updateRecord,

      categoriesLoaded,
      expenseCategories,
      incomeCategories,
      loadRecords,
      addCategory,
      deleteCategory,
      loadCategories,
    };
  },
  {
    // persist: false as any
    persist: {
      key: "records-store",
      storage: localStorage,
      paths: ["records"],
    } as any,
  },
);
