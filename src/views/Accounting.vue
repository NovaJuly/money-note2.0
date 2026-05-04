<template>
  <div class="accounting">
    <main class="page-content">
      <!-- 统计卡片 -->
      <!-- 记账表单 -->
      <RecordForm />
      <!-- 流水列表 -->
      <div class="record-list-wrapper">
        <RecordList />
      </div>
    </main>
  </div>
</template>
<script setup lang="ts">
import { useRecordsStore } from "@/stores/records";
import RecordForm from "@/components/RecordForm.vue";
import RecordList from "@/components/RecordList.vue";

const recordsStore = useRecordsStore();
</script>

<style scoped>
.accounting {
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
.record-list-wrapper {
  margin-top: 16px;
  width: 100%;
  overflow-x: hidden;
}
</style>
