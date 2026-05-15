<template>
  <div class="reports-page">
    <div class="report-header">
      <h2>📊 财务分析报告</h2>
    </div>

    <!-- 主 Tab：周报 / 月报 / 年报 / 自定义 -->
    <el-tabs
      v-model="activeTab"
      @tab-change="handleTabChange"
      class="report-tabs"
    >
      <el-tab-pane label="周报" name="week">
        <div class="sub-switch">
          <el-button @click="goPrev" :icon="ArrowLeft" circle size="small" />
          <span class="date-display">{{ currentDateText }}</span>
          <el-button @click="goNext" :icon="ArrowRight" circle size="small" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="月报" name="month">
        <div class="sub-switch">
          <el-button @click="goPrev" :icon="ArrowLeft" circle size="small" />
          <span class="date-display">{{ currentDateText }}</span>
          <el-button @click="goNext" :icon="ArrowRight" circle size="small" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="年报" name="year">
        <div class="sub-switch">
          <el-button @click="goPrev" :icon="ArrowLeft" circle size="small" />
          <span class="date-display">{{ currentDateText }}</span>
          <el-button @click="goNext" :icon="ArrowRight" circle size="small" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="自定义" name="custom">
        <div class="sub-switch">
          <el-date-picker
            v-model="customRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleCustomRangeChange"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 统计卡片 -->
    <div class="summary-cards">
      <div class="summary-card income-bg">
        <div class="label">总收入</div>
        <div class="value">
          ¥{{ currentIncome.toFixed(2) }}
          <span
            v-if="comparison.incomePercent !== null"
            :class="comparison.incomePercent >= 0 ? 'up' : 'down'"
          >
            {{ comparison.incomePercent >= 0 ? "+" : ""
            }}{{ comparison.incomePercent.toFixed(1) }}%
          </span>
        </div>
      </div>
      <div class="summary-card expense-bg">
        <div class="label">总支出</div>
        <div class="value">
          ¥{{ currentExpense.toFixed(2) }}
          <span
            v-if="comparison.expensePercent !== null"
            :class="comparison.expensePercent >= 0 ? 'down' : 'up'"
          >
            {{ comparison.expensePercent >= 0 ? "+" : ""
            }}{{ comparison.expensePercent.toFixed(1) }}%
          </span>
        </div>
      </div>
      <div class="summary-card balance-bg">
        <div class="label">结余</div>
        <div class="value">
          ¥{{ (currentIncome - currentExpense).toFixed(2) }}
        </div>
      </div>
      <div class="summary-card avg-bg">
        <div class="label">日均支出</div>
        <div class="value">¥{{ avgDailyExpense.toFixed(2) }}</div>
      </div>
    </div>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <h4>支出分类占比</h4>
          <div ref="pieChartRef" style="height: 320px"></div>
        </div>
      </el-col>
      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <h4>{{ barChartTitle }}</h4>
          <div ref="barChartRef" style="height: 320px"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 排行榜 -->
    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <div class="chart-card">
          <h4>支出排行</h4>
          <el-table
            v-if="topExpenseCategories.length > 0"
            :data="topExpenseCategories"
            stripe
            size="small"
          >
            <el-table-column prop="category" label="类别" />
            <el-table-column prop="amount" label="金额" sortable>
              <template #default="{ row }"
                >¥{{ row.amount.toFixed(2) }}</template
              >
            </el-table-column>
            <el-table-column prop="percent" label="占比" sortable>
              <template #default="{ row }">{{ row.percent }}%</template>
            </el-table-column>
          </el-table>
          <div v-else class="no-data">暂无支出数据</div>
        </div>
      </el-col>
      <el-col :xs="24" :md="12">
        <div class="chart-card">
          <h4>收入排行</h4>
          <el-table
            v-if="topIncomeCategories.length > 0"
            :data="topIncomeCategories"
            stripe
            size="small"
          >
            <el-table-column prop="category" label="类别" />
            <el-table-column prop="amount" label="金额" sortable>
              <template #default="{ row }">
                ¥{{ row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="percent" label="占比" sortable>
              <template #default="{ row }"> {{ row.percent }}% </template>
            </el-table-column>
          </el-table>
          <div v-else class="no-data">暂无收入数据</div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, nextTick, watch } from "vue";
import { useRoute } from "vue-router";
import { useRecordsStore } from "@/stores/records";
import * as echarts from "echarts";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import isLeapYear from "dayjs/plugin/isLeapYear";

dayjs.extend(isLeapYear);

const recordsStore = useRecordsStore();
const route = useRoute();

// ----- 状态 -----
const activeTab = ref<"week" | "month" | "year" | "custom">("month");
const weekOffset = ref(0);
const monthOffset = ref(0);
const yearOffset = ref(0);
const customRange = ref<[string, string] | null>(null);

// 计算当前起止日期和显示文本
const currentDateText = computed(() => {
  const now = dayjs();
  if (activeTab.value === "week") {
    const base = now.add(weekOffset.value, "week");
    const start = base.startOf("week");
    const end = base.endOf("week");
    return `${start.format("M/D")}-${end.format("M/D")}`;
  }
  if (activeTab.value === "month") {
    const base = now.add(monthOffset.value, "month");
    return base.format("YYYY年M月");
  }
  if (activeTab.value === "year") {
    const base = now.add(yearOffset.value, "year");
    return base.format("YYYY年");
  }
  return "";
});
// 根据activeTab和偏移量重新计算currentRange
// 修改原有的currentRange计算属性，使其依赖偏移量
const currentRange = computed(() => {
  const now = dayjs();
  if (activeTab.value === "week") {
    const base = now.add(weekOffset.value, "week");
    return {
      start: base.startOf("week").format("YYYY-MM-DD"),
      end: base.endOf("week").format("YYYY-MM-DD"),
    };
  }
  if (activeTab.value === "month") {
    const base = now.add(monthOffset.value, "month");
    return {
      start: base.startOf("month").format("YYYY-MM-DD"),
      end: base.endOf("month").format("YYYY-MM-DD"),
    };
  }
  if (activeTab.value === "year") {
    const base = now.add(yearOffset.value, "year");
    return {
      start: base.startOf("year").format("YYYY-MM-DD"),
      end: base.endOf("year").format("YYYY-MM-DD"),
    };
  }
  // custom
  if (customRange.value) {
    return { start: customRange.value[0], end: customRange.value[1] };
  }
  return { start: now.format("YYYY-MM-DD"), end: now.format("YYYY-MM-DD") };
});

// 左右切换方法
const goPrev = () => {
  if (activeTab.value === "week") weekOffset.value--;
  else if (activeTab.value === "month") monthOffset.value--;
  else if (activeTab.value === "year") yearOffset.value--;
  loadCharts();
};

const goNext = () => {
  if (activeTab.value === "week") weekOffset.value++;
  else if (activeTab.value === "month") monthOffset.value++;
  else if (activeTab.value === "year") yearOffset.value++;
  loadCharts();
};

// Tab切换时重置偏移量
const handleTabChange = () => {
  weekOffset.value = 0;
  monthOffset.value = 0;
  yearOffset.value = 0;
  loadCharts();
};
// 响应路由参数（从首页跳转）
onMounted(() => {
  if (route.query.range === "month") {
    activeTab.value = "month";
    monthOffset.value = 0;
    yearOffset.value = 0;
  }
  loadCharts();
});

// ----- 计算当前起止日期及对比起止日期 -----
const compareRanges = computed(() => {
  if (activeTab.value === "custom") return [];
  const now = dayjs();
  const count = 3;
  const ranges: { start: string; end: string; label: string }[] = [];
  for (let i = 1; i <= count; i++) {
    let base: dayjs.Dayjs;
    if (activeTab.value === "week")
      base = now.add(weekOffset.value - i, "week");
    else if (activeTab.value === "month")
      base = now.add(monthOffset.value - i, "month");
    else base = now.add(yearOffset.value - i, "year");

    let start: string, end: string, label: string;
    if (activeTab.value === "week") {
      start = base.startOf("week").format("YYYY-MM-DD");
      end = base.endOf("week").format("YYYY-MM-DD");
      label = `${dayjs(start).format("M/D")}-${dayjs(end).format("M/D")}`;
    } else if (activeTab.value === "month") {
      start = base.startOf("month").format("YYYY-MM-DD");
      end = base.endOf("month").format("YYYY-MM-DD");
      label = base.format("YYYY年M月");
    } else {
      start = base.startOf("year").format("YYYY-MM-DD");
      end = base.endOf("year").format("YYYY-MM-DD");
      label = base.format("YYYY年");
    }
    ranges.push({ start, end, label });
  }
  return ranges;
});

// 各对比期的记录列表
const compareRecordsList = computed(() => {
  return compareRanges.value.map((range) => {
    return recordsStore.records.filter((r) => {
      const d = dayjs(r.date);
      return (
        d.isAfter(dayjs(range.start).subtract(1, "day")) &&
        d.isBefore(dayjs(range.end).add(1, "day"))
      );
    });
  });
});
// 过滤记录
const currentRecords = computed(() => {
  const { start, end } = currentRange.value;
  return recordsStore.records.filter((r) => {
    const d = dayjs(r.date);
    return (
      d.isAfter(dayjs(start).subtract(1, "day")) &&
      d.isBefore(dayjs(end).add(1, "day"))
    );
  });
});

// 对比范围记录
const compareRecords = computed(() => compareRecordsList.value[0] || []);

// 统计数据
const currentIncome = computed(() =>
  currentRecords.value
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + Number(r.amount), 0),
);
const currentExpense = computed(() =>
  currentRecords.value
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + Number(r.amount), 0),
);

const compareIncome = computed(() =>
  compareRecords.value
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + Number(r.amount), 0),
);
const compareExpense = computed(() =>
  compareRecords.value
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + Number(r.amount), 0),
);
// 对比指标
const comparison = computed(() => {
  if (!compareRecords.value.length) {
    return {
      incomeDiff: null,
      incomePercent: null,
      expenseDiff: null,
      expensePercent: null,
    };
  }
  const incDiff = currentIncome.value - compareIncome.value;
  const inPct =
    compareIncome.value !== 0
      ? (incDiff / compareIncome.value) * 100
      : currentIncome.value > 0
        ? 100
        : 0;
  const expDiff = currentExpense.value - compareExpense.value;
  const expPct =
    compareExpense.value !== 0
      ? (expDiff / compareExpense.value) * 100
      : currentExpense.value > 0
        ? 100
        : 0;
  return {
    incomeDiff: incDiff,
    incomePercent: inPct,
    expenseDiff: expDiff,
    expensePercent: expPct,
  };
});

const avgDailyExpense = computed(() => {
  const expense = currentExpense.value;
  const start = dayjs(currentRange.value.start);
  const end = dayjs(currentRange.value.end);
  const days = end.diff(start, "day") + 1;
  return expense / (days || 1);
});

// 图表引用(饼加柱)
const pieChartRef = ref<HTMLElement | null>(null);
const barChartRef = ref<HTMLElement | null>(null);
let pieChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;

const barChartTitle = computed(() => {
  if (activeTab.value === "week") return "周收支对比";
  if (activeTab.value === "month") return "月收支对比";
  if (activeTab.value === "year") return "年收支对比";
  return "收支对比";
});
const loadCharts = () => {
  nextTick(() => {
    renderPieChart();
    renderBarChart();
  });
};
// 饼图
const renderPieChart = () => {
  if (!pieChartRef.value) return;
  pieChart = echarts.init(pieChartRef.value);
  const expenseRecords = currentRecords.value.filter(
    (r) => r.type === "expense",
  );
  const map = new Map<string, number>();
  expenseRecords.forEach((r) =>
    map.set(r.category, (map.get(r.category) || 0) + Number(r.amount)),
  );
  const data = Array.from(map.entries()).map(([name, value]) => ({
    name,
    value,
  }));
  pieChart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: ¥{c} ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "55%"],
        itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
        data,
        label: {
          show: data.length > 0,
          formatter: "{b}: ¥{c} ({d}%)",
          position: "outside",
        },
        emphasis: { label: { show: true, fontSize: "16", fontWeight: "bold" } },
      },
    ],
  });
};
// 柱状图
const renderBarChart = () => {
  if (!barChartRef.value) return;
  barChart = echarts.init(barChartRef.value);

  const curIncome = currentRecords.value
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + Number(r.amount), 0);
  const curExpense = currentRecords.value
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + Number(r.amount), 0);

  // 按时间从早到晚排列：前N期 → ... → 前1期 → 本期
  const categories: string[] = [];
  const incomes: number[] = [];
  const expenses: number[] = [];

  // 按时间正序：最早的前期 → … → 最近的前期 → 本期
  // compareRanges 顺序为 i=1(前1) → i=4(前4)，所以需反向遍历取最早的前期
  for (let i = compareRanges.value.length - 1; i >= 0; i--) {
    const range = compareRanges.value[i];
    if (!range) continue;
    const records = compareRecordsList.value[i] || [];
    const inc = records
      .filter((r) => r.type === "income")
      .reduce((s, r) => s + Number(r.amount), 0);
    const exp = records
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + Number(r.amount), 0);
    categories.push(range.label);
    incomes.push(inc);
    expenses.push(exp);
  }
  // 最后在末尾添加本期
  categories.push(`本期（${currentDateText.value}）`);
  incomes.push(curIncome);
  expenses.push(curExpense);

  barChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["收入", "支出"], bottom: 0 },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        interval: 0, // 强制显示每一个标签
        rotate: categories.length > 5 ? 30 : 0, // 如果标签多，轻微旋转
        fontSize: 12,
      },
    },
    yAxis: { type: "value" },
    series: [
      { name: "收入", type: "bar", data: incomes, color: "#67c23a" },
      { name: "支出", type: "bar", data: expenses, color: "#f56c6c" },
    ],
    grid: { bottom: 60 },
  });
};

// 排行榜
const topExpenseCategories = computed(() => {
  const map = new Map<string, number>();
  currentRecords.value
    .filter((r) => r.type === "expense" && r.category)
    .forEach((r) => {
      map.set(r.category, (map.get(r.category) || 0) + (Number(r.amount) || 0));
    });
  const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
  return Array.from(map.entries())
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percent: ((amt / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.amount - a.amount);
  // .slice(0, 5);
});

const topIncomeCategories = computed(() => {
  const map = new Map<string, number>();
  currentRecords.value
    .filter((r) => r.type === "income" && r.category)
    .forEach((r) => {
      map.set(r.category, (map.get(r.category) || 0) + (Number(r.amount) || 0));
    });
  const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
  return Array.from(map.entries())
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percent: ((amt / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.amount - a.amount);
  // .slice(0, 5);
});

// ----- 事件处理 -----
const handleCustomRangeChange = () => {
  if (customRange.value) loadCharts();
};

window.addEventListener("resize", () => {
  pieChart?.resize();
  barChart?.resize();
});
</script>

<style scoped>
.reports-page {
  padding: 8px 0;
}
.reports-header h2 {
  margin: 0 0 16px;
  color: #2c3e50;
}
.report-tabs {
  margin-bottom: 20px;
}
.sub-switch {
  margin-top: 12px;
  margin-bottom: 8px;
}
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border-left: 4px solid #667eea;
  position: relative;
}
.income-bg {
  border-left-color: #67c23a;
}
.expense-bg {
  border-left-color: #f56c6c;
}
.balance-bg {
  border-left-color: #409eff;
}
.avg-bg {
  border-left-color: #e6a23c;
}
.label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}
.value {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.value .up {
  color: #f56c6c;
  font-size: 14px;
  font-weight: 500;
}
.value .down {
  color: #67c23a;
  font-size: 14px;
  font-weight: 500;
}
.sub-text {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}
.chart-row {
  margin-bottom: 20px;
}
.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
}
.chart-card h4 {
  margin: 0 0 12px;
  color: #2c3e50;
}
.sub-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
}
.date-display {
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
  min-width: 140px;
  text-align: center;
}
.no-data {
  text-align: center;
  color: #909399;
  padding: 24px;
  font-size: 14px;
}
</style>
