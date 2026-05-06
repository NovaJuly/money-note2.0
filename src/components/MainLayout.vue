<template>
  <div class="main-layout">
    <!-- 左侧导航栏 -->
    <div :class="['sidebar', { collapsed }]">
      <div class="sidebar-toggle" @click="collapsed = !collapsed">
        <el-icon class="toggle-icon">
          <Fold v-if="!collapsed" />
          <Expand v-else />
        </el-icon>
      </div>
      <el-menu
        :default-active="currentRoute"
        :collapse="collapsed"
        collapse-transition
        router
        background-color="#ffffff"
        text-color="#333333"
        active-text-color="#333333"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/accounting">
          <el-icon><Edit /></el-icon>
          <span>记账</span>
        </el-menu-item>
        <el-menu-item index="/reports">
          <el-icon><TrendCharts /></el-icon>
          <span>报表</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 右侧主体 -->
    <div class="main-area">
      <!-- 固定头部 -->
      <header class="dashboard-header">
        <div class="header-default-content">
          <h1>📒 记一笔 · 财务手账</h1>
          <!-- 后端状态指示器 -->
          <el-tooltip
            :content="isBackendOnline ? '服务器连接正常' : '服务器离线'"
            placement="bottom"
          >
            <span
              class="status-indicator"
              :class="{ online: isBackendOnline, offline: !isBackendOnline }"
            >
              <span class="status-dot"></span>
              <span class="status-text">{{
                isBackendOnline ? "服务器连接正常" : "服务器离线"
              }}</span>
            </span>
          </el-tooltip>
          <div class="user-info">
            <span class="welcome"
              >👋 {{ userStore.currentUser?.username }}</span
            >
            <!-- <el-button @click="router.push('/settings')" link>设置</el-button> -->
            <el-button type="danger" text @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
              退出
            </el-button>
          </div>
        </div>
      </header>

      <!-- 次级工具栏容器 (Teleport 目标) -->
      <div id="header-portal" class="header-portal"></div>

      <!-- 内容区域渲染子路由 -->
      <div class="content-wrapper">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { ElMessageBox } from "element-plus";
import {
  Fold,
  Expand,
  DataBoard,
  Edit,
  TrendCharts,
  Setting,
  SwitchButton,
} from "@element-plus/icons-vue";
import { isBackendOnline } from "@/api/request";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const collapsed = ref(false);

// 当前激活的菜单项
const currentRoute = computed(() => route.path);

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm("确定要退出登录吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    userStore.logout();
    router.push("/login");
  } catch {
    // 取消
  }
};
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
  overflow: hidden;
}

/* 左侧栏 */
.sidebar {
  width: 110px;
  background: #ffffff;
  transition: width 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  display: flex;
  flex-direction: column;
  z-index: 10;
}
.sidebar.collapsed {
  width: 64px;
}
.sidebar-toggle {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333333;
  cursor: pointer;
  font-size: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.3s;
}
.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}
.sidebar .el-menu {
  border-right: none;
  flex: 1;
  width: 100% !important;
}
.sidebar .el-menu-item.is-active {
  background-color: #f0f2f5; /* 选中项浅灰背景 */
  color: #409eff; /* 主题蓝色文字 */
}

.sidebar .el-menu-item:hover {
  background-color: #f5f7fa; /* 悬停效果 */
}
.toggle-icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  justify-content: center;
  align-items: center;
}

/* 右侧区域 */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dashboard-header {
  display: flex;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  z-index: 11;
}

.header-portal {
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  z-index: 10;
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
  max-height: 0;
  border-bottom: 0px solid transparent;
}

.header-portal:not(:empty) {
  max-height: 56px;
  border-bottom: 1px solid #f1f5f9;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.header-default-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: default;
  transition: all 0.3s;
  color: #999; /* 默认灰色（用于过渡状态） */
}

.status-indicator.online {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.08);
}

.status-indicator.offline {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.08);
}

.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor; /* 自动跟随父级 color */
  box-shadow: none; /* 盒子阴影可以省略，或者直接为圆点加发光效果 */
}

.status-text {
  line-height: 1;
  color: inherit; /* 从 .status-indicator 继承文字颜色 */
}

.dashboard-header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
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

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
