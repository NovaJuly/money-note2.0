<template>
  <el-row :gutter="20" class="stats-row">
    <el-col :xs="24" :sm="8">
      <el-card shadow="hover" class="stat-card income">
        <div class="stat-title">总收入</div>
        <div class="stat-value">¥ {{ monthlyIncome.toFixed(2) }}</div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="8">
      <el-card shadow="hover" class="stat-card expense">
        <div class="stat-title">总支出</div>
        <div class="stat-value">¥ {{ monthlyExpense.toFixed(2) }}</div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="8">
      <el-card shadow="hover" class="stat-card balance">
        <div class="stat-title">结余</div>
        <div class="stat-value" :class="{ negative: monthlyBalance < 0 }">
          ¥ {{ monthlyBalance.toFixed(2) }}
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>
<script setup lang="ts">
defineProps({
  monthlyIncome: {
    type: Number,
    default: 0,
  },
  monthlyExpense: {
    type: Number,
    default: 0,
  },
  monthlyBalance: {
    type: Number,
    default: 0,
  },
})
</script>

<style scoped>
.stats-row {
  margin-bottom: 20px;
}
.stat-card {
  text-align: center;
  border-radius: 12px;
}
.stat-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: 600;
  filter: saturate(0.85);
}
.income .stat-value {
  color: #67c23a;
}
.expense .stat-value {
  color: #f56c6c;
}
.balance .stat-value {
  color: #409eff;
}
.balance .stat-value.negative {
  color: #f56c6c;
}
</style>