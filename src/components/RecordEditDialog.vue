<template>
  <el-form-item label="备注">
    <MarkdownEditor v-model="form.note" :maxlength="maxlength" />
  </el-form-item>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { useRecordsStore, type BillRecord } from "@/stores/records";
import MarkdownEditor from "./MarkdownEditor.vue";

const props = withDefaults(defineProps<{
  modelValue: boolean;
  record: BillRecord | null;
  maxlength?: number;
}>(), {
  maxlength: 100,   // 默认100字
})
const emit = defineEmits(["update:modelValue"]);

const recordsStore = useRecordsStore();
const visible = ref(props.modelValue);
const loading = ref(false);

const categories = computed(() => {
  return form.type === "income"
    ? recordsStore.incomeCategories
    : recordsStore.expenseCategories;
});

const defaultForm = (record: BillRecord | null) => ({
  type: (record?.type || "expense") as "income" | "expense",
  amount: record?.amount || 0,
  category: record?.category || "",
  date: record?.date || new Date().toLocaleDateString(),
  note: record?.note || "",
});

const form = reactive(defaultForm(props.record));

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val;
    if (val && props.record) {
      Object.assign(form, defaultForm(props.record));
    }
  },
);

watch(visible, (val) => emit("update:modelValue", val));

// ★ 新增：监听 record 变化（当对话框已打开时，直接更新表单）
watch(() => props.record, (newRecord) => {
  if (visible.value && newRecord) {
    Object.assign(form, defaultForm(newRecord));
  }
});
// 切换类型时重置分类
watch(
  () => form.type,
  () => {
    form.category = categories.value[0]?.name || "";
  },
);
</script>
