import { useUserStore } from "@/stores/user";
import { createRouter, createWebHistory } from "vue-router";


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/login",
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/Login.vue"),
      meta: { requiresGuest: true, title: "登录页" }, // 仅未登录用户可访问
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/Register.vue"),
      meta: { requiresGuest: true, title: "注册页" }, // 仅未登录用户可访问
    },
    {
      path: "/",
      component: () => import("@/components/MainLayout.vue"),
      redirect: "/dashboard",
      children: [
        {
          path: "dashboard",
          component: () => import("@/views/Dashboard.vue"),
          meta: { requiresAuth: true, title: "首页" },
        },
        {
          path: "accounting",
          component: () => import("@/views/Accounting.vue"),
          meta: { requiresAuth: true, title: "记账页" },
        },
        {
          path: "settings",
          component: () => import("@/views/Settings.vue"),
          meta: { requiresAuth: true, title: "设置页" },
        },
        {
          path: "reports",
          component: () => import("@/views/ReportsPage.vue"),
          meta: { requiresAuth: true, title: "报表页" },
        },
      ],
    },
  ],
});
// 全局前置守卫
router.beforeEach((to, from) => {
  const userStore = useUserStore();
  const isAuthenticated = userStore.isLoggedIn;
  const baseTitle = "记一笔 · 财务手账";
  document.title = to.meta.title
    ? `${baseTitle} - ${to.meta.title}`
    : baseTitle;
  // 需要认证但未登录 → 重定向到登录页
  if (to.meta.requiresAuth && !isAuthenticated) {
    return "/login";
  }
  // 已登录时访问登录/注册页 → 重定向到仪表盘
  else if (to.meta.requiresGuest && isAuthenticated) {
    return "/dashboard";
  }
});
export default router;
