<template>
  <div class="records-page">
    <main class="page-content">
      <div class="page-header">
        <h2>账单明细</h2>
        <el-button type="primary" @click="router.push('/accounting')">
          记一笔
        </el-button>
      </div>
      <div class="record-list-wrapper">
        <RecordList />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import RecordList from "@/components/RecordList.vue";

const router = useRouter();
</script>

<style scoped>
.records-page {
  min-height: 100vh;
  background: #f5f7fa;
  overflow-x: hidden;
}
.page-content {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}
.record-list-wrapper {
  width: 100%;
  overflow-x: hidden;
}
</style>
