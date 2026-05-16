<template>
  <el-form-item label="备注">
    <MarkdownEditor
      :model-value="note"
      @update:model-value="emit('update:note', $event)"
      :maxlength="maxlength"
    />
  </el-form-item>
</template>

<script setup lang="ts">
import MarkdownEditor from "./MarkdownEditor.vue";

const props = withDefaults(defineProps<{
  note: string;
  maxlength?: number;
}>(), {
  maxlength: 100,
});

const emit = defineEmits<{
  (e: 'update:note', value: string): void;
}>();
</script>