// 封装axios请求
import axios from "axios";
import axiosRetry from "axios-retry";
import type { AxiosResponse, AxiosError } from "axios";
import { useUserStore } from "@/stores/user";

// 创建axios实例
const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || "/api",
  // 3 秒对登录、批量导入这类请求太紧，弱网下会先超时再触发 2 次重试，
  // 体感是"卡十几秒然后失败"。心跳检测仍单独使用 3 秒超时。
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
// 请求拦截器
instance.interceptors.request.use((config) => {
  // 本地存储可能被手动改过或已损坏，解析失败时不能让所有请求一起挂掉
  let token: string | undefined;
  try {
    const raw = localStorage.getItem("user-store"); // 获取 JSON 字符串
    const data = raw ? JSON.parse(raw) : null;
    token = data?.token; // 取出 token 字段
  } catch {
    console.warn("读取本地登录态失败，本次请求不携带 token");
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.config.responseType === "blob") {
      return response as any; // 保持完整的响应对象，让调用方自行处理 blob
    }
    return response.data;
  },
  async (error: AxiosError) => {
    // 如果后端有返回（例如 4xx/5xx），我们可以拿到 error.response.data
    if (error.response) {
      const { status, data: body } = error.response;
      if (status === 401) {
        // 如果已经有刷新 token 的逻辑，可在此处调用，成功后重试原请求
        // 否则直接跳转登录页
        const userStore = useUserStore();
        userStore.logout();
        // 走路由跳转而不是整页刷新，避免丢失 SPA 状态与提示。
        // 用动态 import 是为了不与 router 形成循环依赖
        void import("@/router").then((m) => m.default.push("/login"));
        return Promise.reject(error);
      }
      // 其他错误码，直接抛出
      return Promise.reject(body || error);
    }
    // 真正的网络不通、超时等，抛出原始错误
    return Promise.reject(error);
  },
);
// 配置重试
axiosRetry(instance, {
  retries: 2,
  retryDelay: (retryCount) => {
    return axiosRetry.exponentialDelay(retryCount);
  },
  retryCondition: (error) => {
    // 只重试网络错误和5XX错误
    if (axiosRetry.isNetworkError(error)) {
      return true;
    }
    return error.response?.status !== undefined && error.response.status >= 500;
  },
  shouldResetTimeout: true,
});

// 重新封装请求方法，让泛型直接决定返回值类型
const http = {
  get:<T = any>(url: string, config?: any)=> 
    instance.get<T>(url, config) as Promise<T>,

  post:<T = any>(url: string, data?: any, config?: any)=> 
    instance.post<T>(url, data, config) as Promise<T>,

  put:<T = any>(url: string, data?: any, config?: any)=> 
    instance.put<T>(url, data, config) as Promise<T>,

  delete:<T = any>(url: string, config?: any)=> 
    instance.delete<T>(url, config) as Promise<T>,
};
export default http;
