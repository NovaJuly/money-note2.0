<template>
  <el-card shadow="never" class="list-card full-screen-card">
    <div class="list-container">
      <el-scrollbar
        class="list-content"
        @end-reached="loadMore"
        :end-reached-threshold="20"
      >
        <!-- 总览头部 -->
        <div class="summary-header" ref="summaryRef">
          <div class="summary-stats-grid">
            <div class="summary-item main today-highlight">
              <span class="label">今日支出</span>
              <span class="amount"
                >¥{{ recordsStore.todayExpense.toFixed(2) }}</span
              >
            </div>
            <div class="summary-divider"></div>
            <div class="summary-stats-side">
              <div class="summary-item">
                <span class="label"
                  >{{ formatMonthLabel(selectedMonth) }}支出</span
                >
                <span class="amount"
                  >¥{{ selectedMonthStats.expense.toFixed(2) }}</span
                >
              </div>
              <div class="summary-item">
                <span class="label"
                  >{{ formatMonthLabel(selectedMonth) }}收入</span
                >
                <span class="amount income"
                  >¥{{ selectedMonthStats.income.toFixed(2) }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredDisplayRecords.length === 0" class="empty-state">
          <el-empty description="暂无账单数据" />
        </div>
        <div v-else class="record-groups">
          <template
            v-for="([date, records], index) in filteredDisplayRecords"
            :key="date"
          >
            <!-- 月份分割线 -->
            <div
              v-if="isFirstDayOfMonth(date, index)"
              :id="'month-' + dayjs(date).format('YYYY-MM')"
              class="month-divider"
            >
              <div class="month-main">
                <span class="month-label">{{
                  dayjs(date).format("YYYY年M月")
                }}</span>
                <div class="month-total-mini">
                  <span>支 ¥{{ getMonthStats(date).expense.toFixed(2) }}</span>
                  <span class="income"
                    >收 ¥{{ getMonthStats(date).income.toFixed(2) }}</span
                  >
                </div>
              </div>
              <div class="divider-line"></div>
            </div>

            <div class="record-group">
              <div class="date-header">
                <span class="date-text">{{ formatDate(date) }}</span>
                
                <div class="date-total">
                  <span class="expense-sum">
                    支 {{ getDateExpense(records).toFixed(2) }}
                  </span>
                  <span class="income-sum">
                    收 {{ getDateIncome(records).toFixed(2) }}
                  </span>
                </div>
              </div>
              
              <div
                v-for="record in records"
                :key="record.id"
                class="record-item"
                @click="openEdit(record)"
              >
              
                <div class="record-icon-wrapper">
                  <el-icon class="category-icon">
                    <component :is="getRecordIcon(record)" />
                  </el-icon>
                </div>
                <div class="record-content">
                  <div class="content-top">
                    <span class="category-name">{{ record.category }}</span>
                  </div>
                  <div class="content-bottom">
                    <span class="record-time">{{
                      dayjs(record.date).format("HH:mm:ss")
                    }}</span>
                    <span v-if="record.note" class="record-note-text">
                      ● {{ record.note }}</span>
                  </div>
                </div>
                <div class="record-amount-section">
                  <div class="amount-value" :class="record.type">
                    {{ record.type === "income" ? "+" : "-"
                    }}{{ record.amount.toFixed(2) }}
                  </div>
                  <div class="record-actions">
                    <el-button
                      type="primary"
                      link
                      @click="handleEdit(record.id)"
                    >
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      @click="handleDelete(record.id)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div v-if="loading" class="loading-state">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>正在加载更多...</span>
          </div>
          <div
            v-if="noMore && filteredDisplayRecords.length > 0"
            class="no-more"
          >
            没有更多数据了
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑记录"
      width="500px"
      :append-to-body="true"
      center
      destroy-on-close
    >
      <el-form :model="editForm" label-position="top">
        <el-form-item label="类型">
          <el-radio-group v-model="editForm.type">
            <el-radio-button value="expense">支出</el-radio-button>
            <el-radio-button value="income">收入</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额" @wheel.prevent="handleEditWheel">
          <el-input-number
            v-model="editForm.amount"
            :min="0"
            :max="99999999"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="editForm.category" style="width: 100%">
            <el-option
              v-for="cat in editCategories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="日期">
          <el-date-picker
            v-model="editForm.date"
            type="date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <RecordEditDialog
          v-model="editDialogVisible"
          :record="editingRecord"
          :maxlength="100"
        />
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 浮动面板 -->
    <teleport to="body">
      <div class="floating-panel">
        <div class="panel-inner">
          <div class="panel-item" @click="triggerStickyMonthPicker">
            <el-date-picker
              ref="stickyMonthPickerRef"
              v-model="selectedMonth"
              type="month"
              format="YYYY年MM月"
              value-format="YYYY-MM"
              :clearable="false"
              :teleported="false"
              class="month-picker-compact"
              placeholder="选择月份"
              @change="handleMonthChange"
            />
            <el-icon class="arrow-icon-mini"><ArrowDown /></el-icon>
          </div>

          <el-button
            size="small"
            round
            class="back-today-sticky-btn"
            @click.stop="backToToday"
          >
            回到今天
          </el-button>

          <div class="stat-row">
            <div class="stat-mini">
              <span class="label">支出</span>
              <span class="val"
                >¥{{ selectedMonthStats.expense.toFixed(2) }}</span
              >
            </div>
            <div class="stat-mini">
              <span class="label">收入</span>
              <span class="val income"
                >¥{{ selectedMonthStats.income.toFixed(2) }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </el-card>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRecordsStore, type BillRecord } from "@/stores/records";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import { extractPlainText } from "@/utils/markdown";
import { Edit, Delete, ArrowDown, Loading } from "@element-plus/icons-vue";
import RecordEditDialog from "@/components/RecordEditDialog.vue";
import { useErrorHandler } from "@/composables/useErrorHandler";
import { useCategoriesStore } from "@/stores/categories";

const { handleError } = useErrorHandler()

const categoryStore = useCategoriesStore();
const recordsStore = useRecordsStore();

// --- 滚动与粘性头部状态 ---
const summaryRef = ref<HTMLElement | null>(null);
const showStickyHeader = ref(false); // 控制 Teleport 粘性头部的显示
const selectedMonth = ref(dayjs().format("YYYY-MM")); // 当前选中的月份
const stickyMonthPickerRef = ref(); // 粘性头部月份选择器引用
const isAutoScrolling = ref(false); // 标记是否正在执行点击跳转产生的自动滚动，避免滚动监听冲突
const editDialog = ref(false);
const editingRecord = ref<BillRecord | null>(null);
const openEdit = (record: BillRecord) => {
  console.log("编辑记录", record);
  editingRecord.value = record;
  editDialog.value = true;
};
// 触发粘性头部的月份选择器
const triggerStickyMonthPicker = (e: Event) => {
  e.stopPropagation();
  stickyMonthPickerRef.value?.handleOpen();
};

// 处理滚动事件：更新粘性头部显示状态及当前视图中的月份
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const scrollTop = target.scrollTop;

  // 1. 判断是否显示粘性头部
  if (summaryRef.value) {
    const rect = summaryRef.value.getBoundingClientRect();
    showStickyHeader.value = rect.top <= 50;
  }

  // 2. 滚动时自动同步当前月份到选择器
  if (!isAutoScrolling.value) {
    if (scrollTop < 50) {
      // 滚动回顶部时，重置为最新月份
      const latestMonth = dayjs().format("YYYY-MM");
      if (selectedMonth.value !== latestMonth) {
        selectedMonth.value = latestMonth;
      }
    } else {
      // 遍历月份分割线，找到当前处于顶部的月份
      const dividers = document.querySelectorAll(".month-divider");
      let currentMonthInView = "";

      dividers.forEach((divider) => {
        const rect = divider.getBoundingClientRect();
        if (rect.top <= 150) {
          currentMonthInView = divider.id.replace("month-", "");
        }
      });

      if (currentMonthInView && currentMonthInView !== selectedMonth.value) {
        selectedMonth.value = currentMonthInView;
      }
    }
  }
};

onMounted(() => {
  // 在内容容器上监听滚动
  const scrollParent = document.querySelector(".content-wrapper");
  if (scrollParent) {
    scrollParent.addEventListener("scroll", handleScroll);
  }
});

onUnmounted(() => {
  const scrollParent = document.querySelector(".content-wrapper");
  if (scrollParent) {
    scrollParent.removeEventListener("scroll", handleScroll);
  }
});

// --- 分页加载与数据分组逻辑 ---
const PAGE_SIZE = 10; // 每次加载的天数
const visibleDays = ref(PAGE_SIZE);
const loading = ref(false);

// 从 store 获取所有分组后的记录
const allGroups = computed(() => recordsStore.groupedRecords);

/**
 * 预计算所有月份的统计数据 (收入/支出)
 * 用于月份分割线和粘性头部的快速展示
 */
const monthStatsMap = computed(() => {
  return recordsStore.records.reduce(
    (acc, record) => {
      const month = dayjs(record.date).format("YYYY-MM");
      if (!acc[month]) {
        acc[month] = { income: 0, expense: 0 };
      }
      if (record.type === "income") {
        acc[month].income += record.amount;
      } else {
        acc[month].expense += record.amount;
      }
      return acc;
    },
    {} as Record<string, { income: number; expense: number }>,
  );
});

// 当前选中月份的统计数据
const selectedMonthStats = computed(() => {
  return monthStatsMap.value[selectedMonth.value] || { income: 0, expense: 0 };
});

// 实际渲染的记录列表（支持无限滚动分页）
const filteredDisplayRecords = computed(() => {
  return allGroups.value.slice(0, visibleDays.value);
});

// 判断是否为月份的第一天，用于渲染月份分割线
const isFirstDayOfMonth = (date: string, index: number) => {
  if (index === 0) return true;
  const prevItem = filteredDisplayRecords.value[index - 1];
  const prevDate = prevItem ? prevItem[0] : "";
  return dayjs(date).format("YYYY-MM") !== dayjs(prevDate).format("YYYY-MM");
};

// 是否加载完所有数据
const noMore = computed(() => {
  return visibleDays.value >= allGroups.value.length;
});

// 手动切换月份：滚动到指定月份位置
const handleMonthChange = (val: string) => {
  if (val) {
    scrollToMonth(val);
  }
};

// 平滑滚动到指定月份的逻辑
const scrollToMonth = async (monthStr: string) => {
  const targetIndex = allGroups.value.findIndex(
    ([date]) => dayjs(date).format("YYYY-MM") === monthStr,
  );

  if (targetIndex !== -1) {
    isAutoScrolling.value = true;
    // 如果目标月份尚未加载，则扩大显示范围
    if (targetIndex >= visibleDays.value) {
      visibleDays.value = targetIndex + PAGE_SIZE;
      await nextTick();
    }

    setTimeout(() => {
      const targetEl = document.getElementById(`month-${monthStr}`);
      if (targetEl) {
        const scrollParent = document.querySelector(".content-wrapper");
        if (scrollParent) {
          const rect = targetEl.getBoundingClientRect();
          const parentRect = scrollParent.getBoundingClientRect();
          const offset = 120; // 偏移量，预留出粘性头部空间
          const targetScrollTop =
            scrollParent.scrollTop + rect.top - parentRect.top - offset;

          scrollParent.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          });

          // 动画结束后恢复滚动监听
          setTimeout(() => {
            isAutoScrolling.value = false;
          }, 800);
        }
      } else {
        isAutoScrolling.value = false;
      }
    }, 50);
  }
};

const disabled = computed(() => loading.value || noMore.value);

/**
 * 无限滚动加载更多
 */
const isScrollDisabled = ref(false);
const loadMore = () => {
  if (isScrollDisabled.value || loading.value || noMore.value) return;
  isScrollDisabled.value = true;
  setTimeout(() => {
    visibleDays.value += PAGE_SIZE;
    isScrollDisabled.value = false;
  }, 300);
};

// --- 工具函数与格式化 ---
/**
 * 格式化月份显示标签
 * @param monthStr 格式为 YYYY-MM 的字符串
 * @returns "本月" 或 "M月"
 */
const formatMonthLabel = (monthStr: string) => {
  const now = dayjs().format("YYYY-MM");
  return monthStr === now ? "本月" : dayjs(monthStr).format("M月");
};

/**
 * 格式化日期显示
 * @param dateStr 格式为 YYYY-MM-DD 的字符串
 * @returns "今天"、"昨天" 或 "M月D日"
 */
const formatDate = (dateStr: string) => {
  const today = dayjs().format("YYYY-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  if (dateStr === today) return dayjs(dateStr).format("M月D日") + " " + "今天";
  if (dateStr === yesterday)
    return dayjs(dateStr).format("M月D日") + " " + "昨天";
  return dayjs(dateStr).format("M月D日");
};

// 根据记录类型和分类名获取图标
const getRecordIcon = (record: BillRecord) => {
  const categories =
    record.type === "expense"
      ? categoryStore.expenseCategories
      : categoryStore.incomeCategories;
  const found = categories.find((c) => c.name === record.category);
  return found?.icon || "More"; // 找不到就用默认图标
};

/**
 * 获取指定日期的月份统计数据
 */
const getMonthStats = (date: string) => {
  const month = dayjs(date).format("YYYY-MM");
  return monthStatsMap.value[month] || { income: 0, expense: 0 };
};

/**
 * 计算一组记录的总支出
 */
const getDateExpense = (items: BillRecord[]) =>
  items
    .filter((r) => r.type === "expense")
    .reduce((sum, r) => sum + r.amount, 0);

/**
 * 计算一组记录的总收入
 */
const getDateIncome = (items: BillRecord[]) =>
  items
    .filter((r) => r.type === "income")
    .reduce((sum, r) => sum + r.amount, 0);

/**
 * 删除记录
 */
const handleDelete = async (id: string) => {
  try {
    recordsStore.deleteRecord(id);
  } catch (error) {
    handleError(error)
    // 用户取消删除
  }
};

// --- 编辑功能逻辑 ---
const editDialogVisible = ref(false);
const editingId = ref<string | null>(null);
const editForm = reactive({
  type: "expense" as "expense" | "income",
  amount: 0,
  category: "",
  date: "",
  note: "",
});

const editCategories = computed(() =>
  editForm.type === "expense"
    ? categoryStore.expenseCategories
    : categoryStore.incomeCategories,
);

const handleEdit = (id: string) => {
  const record = recordsStore.records.find((r) => r.id === id);
  if (!record) return;
  editingId.value = record.id;
  editForm.type = record.type;
  editForm.amount = record.amount;
  editForm.category = record.category;
  editForm.date = record.date;
  editDialogVisible.value = true;
};

const handleSaveEdit = () => {
  if (!editingId.value) {
    return;
  }
  recordsStore.updateRecord(editingId.value, {
    ...editForm,
    note: extractPlainText(editForm.note), // 同步更新纯文本摘要
  });
  editDialogVisible.value = false;
  ElMessage.success("修改成功");
};

/**
 * 鼠标滚轮快速调整金额
 */
const editAmountStep = 1;
const handleEditWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? -editAmountStep : editAmountStep;
  const newVal = editForm.amount + delta;
  editForm.amount = Math.max(
    0,
    Math.min(99999999, parseFloat(newVal.toFixed(2))),
  );
};

/**
 * 回到今天/回到顶部逻辑
 */
const backToToday = () => {
  selectedMonth.value = dayjs().format("YYYY-MM");
  const scrollContainer = document.querySelector(".content-wrapper");
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
  }
};
</script>

<style scoped>
.list-card {
  border: none;
  border-radius: 0;
  background: transparent;
}
:deep(.el-card__body) {
  padding: 0;
}
.floating-panel {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-radius: 16px 0 0 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 16px;
  width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.panel-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
/* 月份选择器区域 */
.panel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
/* 统计信息 */
.stat-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.stat-mini {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 13px;
}

.stat-mini .label {
  color: #666;
}

.stat-mini .val {
  font-weight: 600;
  color: #333;
}

.stat-mini .val.income {
  color: #67c23a;
}

.back-today-sticky-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  writing-mode: vertical-rl;          /* 文字从上到下，从右到左排列 */
  text-orientation: upright;          /* 保持字符正向，不旋转 */
  letter-spacing: 2px;                /* 字间距 */
  height: auto;                       /* 让按钮高度自适应文字 */
  min-height: 80px;  
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-weight: 700;
  font-size: 12px;
  padding: 0 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.back-today-sticky-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: #f5f7ff;
}

/* 隐藏 DatePicker 的边框 */
:deep(.month-picker-compact) {
  width: 110px;
}

:deep(.month-picker-compact .el-input__wrapper) {
  background-color: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  cursor: pointer;
}

:deep(.month-picker-compact .el-input__inner) {
  font-weight: 700;
  font-size: 17px;
  color: #0f172a;
  cursor: pointer;
}

.list-container {
  position: relative;
}

.list-content {
  padding: 0 0 24px;
  background: #ffffff;
}

.stat-mini {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
}

.stat-mini .label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  background: #fff;
  padding: 2px 6px;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.stat-mini .val {
  font-size: 16px;
  font-weight: 800;
  color: #ef4444;
  letter-spacing: -0.5px;
}

.stat-mini .val.income {
  color: #10b981;
}

.summary-header {
  padding: 12px 0 24px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
  position: relative;
  z-index: 1;
  margin-bottom: 16px;
}

.summary-stats-grid {
  display: flex;
  align-items: stretch;
  gap: 24px;
  background: #fff;
  padding: 0 16px;
}

.summary-item.main.today-highlight {
  flex: 1;
  padding: 24px;
  margin-left: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  border-radius: 24px;
  border: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(99, 102, 241, 0.15);
}

.summary-item.main.today-highlight .label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 4px;
}

.summary-item.main.today-highlight .amount {
  color: #ffffff;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -1px;
}

.summary-divider {
  width: 1px;
  background: #f1f5f9;
  margin: 10px 0;
}

.summary-stats-side {
  flex: 1.2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-right: 8px;
}

.summary-stats-side .summary-item {
  padding: 20px;
  background: #f8fafc;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.3s ease;
}

.summary-stats-side .summary-item:hover {
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  transform: translateY(-2px);
}

.summary-stats-side .label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.summary-stats-side .amount {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.summary-stats-side .amount.income {
  color: #10b981;
}

/* 响应式媒体查询 */
@media (max-width: 768px) {
  .summary-stats-grid {
    flex-direction: column;
    gap: 16px;
  }

  .summary-divider {
    display: none;
  }

  .summary-stats-side {
    grid-template-columns: 1fr 1fr;
  }

  .stat-mini {
    padding: 4px 8px;
  }

  .stat-mini .val {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .summary-stats-side {
    grid-template-columns: 1fr;
  }

  .record-item {
    padding: 12px;
  }

  .category-name {
    font-size: 15px;
  }
}

.record-groups {
  padding: 0 16px;
  border: 1px solid #000000;
}

.month-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 16px;
  padding: 0 4px;
}

.month-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.month-label {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
}

.month-total-mini {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #94a3b8;
}

.month-total-mini .income {
  color: #10b981;
}

.divider-line {
  height: 1px;
  flex: 1;
  background: linear-gradient(to right, #e2e8f0, transparent);
}

.record-group {
  margin-bottom: 24px;
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  z-index: 5;
  margin-bottom: 12px;
  border-radius: 12px;
  margin-left: -8px;
  margin-right: -8px;
}

.date-text {
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-total {
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  gap: 12px;
  font-weight: 600;
}

.date-total span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.date-total .expense-sum {
  color: #f87171;
}

.date-total .income-sum {
  color: #34d399;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 20px;
  margin-bottom: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  border-bottom: 1px solid #ebf2f8;
}

.record-item:hover {
  background: #f8fafc;
  transform: translateX(4px);
  border-color: #f1f5f9;
}

.record-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.category-icon {
  font-size: 24px;
}

.record-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.category-name {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.content-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-time {
  font-size: 12px;
  color: #94a3b8;
}

.record-note-text {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-amount-section {
  text-align: right;
  margin-left: 16px;
}

.amount-value {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.amount-value.expense {
  color: #000000;
}

.amount-value.income {
  color: #10b981;
}

.record-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s;
  margin-top: 4px;
}

.record-item:hover .record-actions {
  opacity: 1;
}

.empty-state {
  padding: 80px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.el-empty__description p) {
  color: #94a3b8;
  font-size: 14px;
}

.loading-state,
.no-more {
  padding: 32px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #94a3b8;
  font-size: 13px;
  gap: 8px;
}

/* 响应式媒体查询补丁 */
@media (max-width: 768px) {
  :deep(.month-picker-compact .el-input__inner) {
    font-size: 15px;
  }
}
</style>
