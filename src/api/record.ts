import http from "./request";

// 记账记录类型
export interface BillRecord {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note: string;
  createdAt: string;
}
// 通用业务响应格式
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
// 获取
export const fetchRecords = () => {
  return http.get<ApiResponse<BillRecord[]>>('/records')
}
// 新增
export const createRecord = (data: Omit<BillRecord, 'id' | 'createdAt'>) => {
  return http.post<ApiResponse<BillRecord>>('/records', data)
}
// 更新
export const updateRecord = (id: number, data: Partial<BillRecord>) => {
  return http.put<ApiResponse<BillRecord>>(`/records/${id}`, data)
}
// 删除
export const deleteRecord = (id: number) => {
  return http.delete<ApiResponse<void>>(`/records/${id}`)
}