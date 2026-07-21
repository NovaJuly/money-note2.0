import http from "./request";
import type { WechatBill } from "@/utils/wechatBillParser";

// 记账记录类型
export interface BillRecord {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note: string;
}
// 通用业务响应格式
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
// 获取
export const fetchRecords = (params?: {
  startDate?: string
  endDate?: string
}) => {
  return http.get<ApiResponse<BillRecord[]>>('/records', { params })
}
// 新增
export const createRecord = (data: Omit<BillRecord, 'id'>) => {
  return http.post<ApiResponse<BillRecord>>('/records', data)
}
// 更新
export const updateRecord = (id: string, data: Partial<BillRecord>) => {
  return http.put<ApiResponse<BillRecord>>(`/records/${id}`, data)
}
// 删除
export const deleteRecord = (id: string) => {
  return http.delete<ApiResponse<void>>(`/records/${id}`)
}
export const importRecords = (records: WechatBill[]) => {
  return http.post('/records/import', { records })
}
export const downloadBackendXlsx = (params?: { startDate?: string; endDate?: string }) => {
  return http.get('/records/export/xlsx', {
    params,
    responseType: 'blob'  // 关键：以二进制方式接收
  })
}