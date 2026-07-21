<template>
  <el-card shadow="never" class="form-card">
    <el-form :model="form" label-position="top">
      <el-row :gutter="16">
        <!-- 类型 -->
        <el-col :xs="24" :sm="6">
          <el-form-item label="类型">
            <el-radio-group v-model="form.type">
              <el-radio-button value="expense">支出</el-radio-button>
              <el-radio-button value="income">收入</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>

        <!-- 金额 -->
        <el-col :xs="24" :sm="6">
          <el-form-item label="金额" @wheel.prevent="handleEditWheel">
            <el-input-number
              v-model="form.amount"
              :min="0"
              :max="99999999"
              :precision="2"
              :step="10"
              controls-position="right"
              style="width: 100%"
              @change="
                (val: number) => {
                  if (typeof val !== 'number' || isNaN(val)) form.amount = 0;
                }
              "
            />
          </el-form-item>
        </el-col>

        <!-- 分类 -->
        <el-col :xs="24" :sm="6">
          <el-form-item label="分类">
            <el-select v-model="form.category" placeholder="请选择分类">
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.name"
              >
                <el-icon><component :is="cat.icon || 'More'" /></el-icon>
                <span style="margin-left: 8px">{{ cat.name }}</span>
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 日期 -->
        <el-col :xs="24" :sm="6">
          <el-form-item label="日期">
            <el-date-picker
              v-model="form.date"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <!-- 时间 -->
      <el-col :xs="24" :sm="6">
        <el-form-item label="时间">
          <el-time-picker
            v-model="form.time"
            placeholder="选择时间"
            format="HH:mm:ss"
            value-format="HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>

      <!-- 备注（Markdown） -->
      <el-form-item label="备注">
        <MarkdownEditor v-model="form.note" />
      </el-form-item>

      <el-button
        type="primary"
        @click.prevent="handleAdd"
        style="margin-top: 8px"
        :loading="addLoading"
        :disabled="addLoading"
      >
        添加记录
      </el-button>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from "vue";
import { ElMessage } from "element-plus";
import { useRecordsStore } from "@/stores/records";
import dayjs from "dayjs";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import { onMounted } from "vue";
const addLoading = ref(false);
import { useErrorHandler } from "@/composables/useErrorHandler";
import { useCategoriesStore } from "@/stores/categories";

const categoryStore = useCategoriesStore();

const { handleError } = useErrorHandler();

const recordsStore = useRecordsStore();

const form = reactive({
  type: "expense" as "income" | "expense",
  amount: 0,
  category: "",
  date: dayjs().format("YYYY-MM-DD"),
  time: dayjs().format("HH:mm:ss"),
  note: "",
});
// 最终提交时，合并为完整时间字符串
const submitDate = computed(() => {
  if (!form.date || !form.time) return "";
  return `${form.date} ${form.time}`;
});

// 根据类型动态切换分类列表
const categories = computed(() => {
  return form.type === "expense"
    ? categoryStore.expenseCategories
    : categoryStore.incomeCategories;
});
// 类型切换时重置分类
watch(
  () => form.type,
  () => {
    form.category = categories.value[0]?.name || "";
  },
  { immediate: true },
);

// 金额滚动轮事件
const editAmountStep = 1;
const handleEditWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? -editAmountStep : editAmountStep;
  const newVal = form.amount + delta;
  form.amount = Math.max(0, Math.min(99999999, parseFloat(newVal.toFixed(2))));
};

const handleAdd = async () => {
  if (!form.category) {
    ElMessage.warning("请选择分类");
    return;
  }
  const safeAmount = Number(form.amount);
  if (!isFinite(safeAmount) || safeAmount < 0) {
    ElMessage.warning("金额格式不正确");
    return;
  }
  // 防止重复点击
  if (addLoading.value) return;
  addLoading.value = true;
  try {
    await recordsStore.addRecord({
      type: form.type,
      amount: safeAmount,
      category: form.category,
      date: submitDate.value,
      note: form.note,
    });
    console.log("Form: handleAdd called", { ...form });
    // 重置金额，保留类型、分类、日期（可保留最近使用的分类）
    form.amount = 0;
    form.note = "";
    ElMessage.success("记录添加成功");
  } catch (error) {
    handleError(error);
  } finally {
    addLoading.value = false;
  }
};
</script>

<style scoped>
.form-card {
  margin-bottom: 20px;
  border-radius: 12px;
}
</style>
