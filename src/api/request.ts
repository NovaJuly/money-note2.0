// 封装axios请求
import axios from "axios";
import { reactive } from "vue";
import axiosRetry, { exponentialDelay } from "axios-retry";
import { ref } from "vue";
import type { AxiosResponse, AxiosError } from "axios";
import { useUserStore } from "@/stores/user";
import { useErrorHandler } from "@/composables/useErrorHandler";

// 创建axios实例
const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || "/api",
  timeout: 3000,
  headers: {
    "Content-Type": "application/json",
  },
});
// 请求拦截器
instance.interceptors.request.use((config) => {
  const raw = localStorage.getItem("user-store"); // 获取 JSON 字符串
  const data = raw ? JSON.parse(raw) : null;
  const token = data?.token; // 取出 token 字段
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
        // 跳转登录页
        window.location.href = "/login";
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
