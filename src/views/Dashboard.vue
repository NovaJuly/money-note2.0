<template>
  <div class="dashboard">
    <main class="dashboard-content">
      <!-- 统计卡片 -->
      <StatsCard
        :monthlyIncome="recordsStore.monthlyIncome"
        :monthlyExpense="recordsStore.monthlyExpense"
        :monthlyBalance="recordsStore.monthlyBalance"
      />

      <!-- 快捷入口 -->
      <div class="quick-actions">
        <el-button type="primary" @click="router.push('/accounting')">
          记一笔
        </el-button>
        <el-button type="primary" @click="router.push('/accounting')">
          查看详情
        </el-button>
        <el-button @click="router.push('/reports')">查看报表</el-button>
      </div>

      <!-- 每日明细标题 + 跳转月度 -->
      <div class="daily-header">
        <h3>每月明细({{ now.format("YYYY-MM") }})</h3>
        <el-button type="warning" plain @click="goMonthlyReport">
          查看本月完整报表
        </el-button>
      </div>

      <!-- 无数据提示 -->
      <div v-if="dailyCards.length === 0" class="empty-tip">
        本月暂无记账记录，快去记一笔吧～
      </div>

      <!-- 每日卡片 -->
      <div v-for="card in dailyCards" :key="card.date" class="daily-card">
        <div class="card-date">
          <span class="date-text">
            {{ card.date.split("-").slice(1).join("月") + "日" }}
          </span>
          <span class="week-text">{{ card.dayOfWeek }}</span>
          <div class="date-summary">
            <span class="income">收 ¥{{ card.income.toFixed(2) }}</span>
            <span class="expense">支 ¥{{ card.expense.toFixed(2) }}</span>
            <span :class="card.net >= 0 ? 'net-positive' : 'net-negative'">
              净 ¥{{ card.net.toFixed(2) }}
            </span>
          </div>
        </div>
        <div class="card-records">
          <div
            v-for="record in card.records"
            :key="record.id"
            class="record-item"
          >
            <el-tag
              :type="record.type === 'income' ? 'success' : 'danger'"
              size="small"
            >
              {{ record.category }}
            </el-tag>
            <span class="record-amount">
              {{ record.type === "income" ? "+" : "-" }}¥{{
                (record.amount || 0).toFixed(2)
              }}
            </span>
            <span class="record-note" v-if="record.note">{{
              record.note
            }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useRecordsStore } from "@/stores/records";
import StatsCard from "@/components/StatsCard.vue";
import dayjs from "dayjs";

const userStore = useUserStore();
const router = useRouter();
const recordsStore = useRecordsStore();

const now = dayjs();
// 每日卡片数据
const dailyCards = computed(() => {
  const groups = Array.isArray(recordsStore.groupedRecords)
    ? recordsStore.groupedRecords
    : [];
  return groups
    .filter(([date]) => {
      if (!date) return false;
      const d = dayjs(date);
      return d.isValid() && d.isSame(now, "month");
    })
    .map(([date, records]) => {
      const validRecords = Array.isArray(records) ? records : [];
      const income = validRecords
        .filter((r) => r.type === "income")
        .reduce((sum, cur) => sum + (cur.amount || 0), 0);
      const expense = validRecords
        .filter((r) => r.type === "expense")
        .reduce((sum, cur) => sum + (cur.amount || 0), 0);
      const d = dayjs(date);
      return {
        date,
        dayOfWeek: d.isValid() ? d.format("dddd") : "",
        income,
        expense,
        net: income - expense,
        records: validRecords,
      };
    })
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
});

const goMonthlyReport = () => {
  router.push({ path: "/reports", query: { range: "month" } });
};
</script>

<style scoped>
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid #e4e7ed;
}

.dashboard-header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.welcome {
  color: #606266;
  font-size: 14px;
}
/* 设置按钮 */
.dashboard-header .el-button.is-link {
  color: #667eea;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 8px;
  /* transition: all 0.1s; */
}

.dashboard-header .el-button.is-link:hover {
  color: #764ba2;
  background: rgba(102, 126, 234, 0.1);
}

/* 退出按钮 */
.dashboard-header .el-button--danger.is-text {
  color: #f56c6c;
  font-weight: 500;
  padding: 4px;
  border-radius: 8px;
  /* transition: all 0.2s; */
  margin: 0;
}

.dashboard-header .el-button--danger.is-text:hover {
  color: #e64545;
  background: rgba(245, 108, 108, 0.1);
}

.dashboard-content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
.quick-actions {
  display: flex;
  gap: 12px;
  margin: 16px 0 24px;
}
.daily-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.daily-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}
.empty-tip {
  text-align: center;
  color: #909399;
  padding: 24px 0;
}
.daily-card {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.card-date {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}
.date-text {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}
.week-text {
  font-size: 14px;
  color: #909399;
}
.date-summary {
  margin-left: auto;
  display: flex;
  gap: 12px;
  font-size: 13px;
}
.income {
  color: #67c23a;
}
.expense {
  color: #000000;
}
.net-positive {
  color: #67c23a;
}
.net-negative {
  color: #f56c6c;
}

.card-records .record-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 14px;
  color: #606266;
}
.record-amount {
  min-width: 70px;
  color: #2c3e50;
}
.record-note {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #909399;
}
</style>
