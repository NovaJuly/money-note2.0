<template>
  <div
    class="auth-container"
    :style="{
      backgroundImage: background ? `url(${background})` : 'none',
    }"
  >
    <div class="auth-card">
      <div class="card-header">
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="card-body">
        <slot name="form" />
      </div>
      <div class="card-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  background?: string;
}>();
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  position: relative;
  padding: 15px;
}

/* 给背景加半透明遮罩，避免背景太亮影响表单可读性 */
.auth-container::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  z-index: 0;
}

.auth-card {
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 44px 36px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  /* transition:
    transform 0.3s ease,
    box-shadow 0.3s ease; */
}

.auth-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.card-header {
  text-align: center;
  margin-bottom: 36px;
}

.card-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 10px;
  letter-spacing: 1px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.card-header p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
}

.card-body {
  margin-bottom: 28px;
}

.card-footer {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}
.auth-card input {
  width: 100%;
  padding: 12px 16px;
  margin: 8px 0;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 14px;
  backdrop-filter: blur(4px);
  outline: none;
  /* transition: background 0.3s ease; */
}

.auth-card input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.auth-card input:focus {
  background: rgba(255, 255, 255, 0.3);
}

.auth-card button {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  /* transition: opacity 0.3s ease; */
}

.auth-card button:hover {
  opacity: 0.9;
}
</style>
