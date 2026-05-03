<script setup lang="ts"></script>

<template>
  <router-view />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html,
body,
#app {
  height: 100%;
  width: 100%;
}
body {
  font-family:
    "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  /* background-image: url("@/assets/bg.png");
  background-size: cover;
  background-attachment: fixed;
  background-position: center; */
}
/* 全局背景伪元素，叠加一层半透明渐变让文字更清晰 */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  z-index: -1;
  pointer-events: none;
}
/* 全局卡片毛玻璃 */
.el-card {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06) !important;
}
</style>
