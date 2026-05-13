// 封装axios请求
import axios from "axios";
import { ref } from "vue";
import type { AxiosResponse } from "axios";
// 全局响应式状态：后端是否可达
export const isBackendOnline = ref(false); // 默认离线状态
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
  <T>(response: AxiosResponse<T>): T => {
    isBackendOnline.value = true;
    if (response.config.responseType === 'blob') {
      return response as any; // 保持完整的响应对象，让调用方自行处理 blob
    }
    return response.data;
  },
  (error: any) => {
    // 如果后端有返回（例如 4xx/5xx），我们可以拿到 error.response.data
    if (error.response && error.response.data) {
      // 把错误当作一次“有业务数据的失败”，抛出整个响应体，让调用方处理
      return Promise.reject(error.response.data);
    }
    // 真正的网络不通、超时等，抛出原始错误
    isBackendOnline.value = false;
    return Promise.reject(error);
  },
);
// 重新封装请求方法，让泛型直接决定返回值类型
const http = {
  get<T = any>(url: string, config?: any): Promise<T> {
    return instance.get(url, config) as Promise<T>;
  },
  post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return instance.post(url, data, config) as Promise<T>;
  },
  put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return instance.put(url, data, config) as Promise<T>;
  },
  delete<T = any>(url: string, config?: any): Promise<T> {
    return instance.delete(url, config) as Promise<T>;
  },
};
export default http;
