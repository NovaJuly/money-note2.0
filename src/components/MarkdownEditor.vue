<template>
  <div class="markdown-editor">
    <div class="editor-pane">
      <el-input
        type="textarea"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :maxlength="maxlength"
        show-word-limit
        placeholder="支持 Markdown 语法"
        class="full-textarea"
      />
    </div>
    <div class="preview-pane markdown-body">
      <div v-if="!hasContent" class="preview-placeholder">
        预览区将显示渲染后的 Markdown 内容
      </div>
      <div v-else v-html="renderedMarkdown" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { marked, Renderer } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    maxlength?: number;
  }>(),
  {
    maxlength: 2000, // 默认2000字
  },
);

defineEmits(["update:modelValue"]);

const renderer = new Renderer();

// 将 HTML 标签转义为纯文本，防止未知标签消失
renderer.html = function ({ text }: { text: string }) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};
// 代码块高亮
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  if (lang && hljs.getLanguage(lang)) {
    const highlighted = hljs.highlight(text, { language: lang }).value;
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
  }
  return `<pre><code class="hljs">${hljs.highlightAuto(text).value}</code></pre>`;
};
marked.setOptions({ renderer });

const renderedMarkdown = computed(
  () => marked(props.modelValue || "") as string,
);
const hasContent = computed(() => (props.modelValue || "").trim().length > 0);
</script>

<style scoped>
.markdown-editor {
  display: flex;
  gap: 12px;
  width: 100%;
  height: 320px;
}
.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.full-textarea {
  flex: 1;
}
.full-textarea :deep(.el-textarea__inner) {
  height: 100% !important;
  resize: none;
}
.preview-pane {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  word-break: break-word;
}
.preview-placeholder {
  color: #909399;
  font-size: 14px;
  text-align: center;
  padding-top: 40px;
}
</style>
