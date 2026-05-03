import http from './request'

// 分类数据结构
export interface CategoryItem {
  id: number
  name: string
  icon: string
  type: 'expense' | 'income'
  createdAt?: string
}
// 通用业务响应格式
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 获取所有分类（可按类型过滤）
export const fetchCategories = (type?: 'expense' | 'income') => {
  return http.get<ApiResponse<CategoryItem[]>>('/setting/categories', { params: { type } })
}

// 创建分类
export const createCategory = (data: { name: string; icon: string; type: 'expense' | 'income' }) => {
  return http.post<ApiResponse<CategoryItem>>('/setting/categories', data)
}

// 更新分类
export const updateCategory = (id: number, data: { name?: string; icon?: string }) => {
  return http.put<ApiResponse<CategoryItem>>(`/setting/categories/${id}`, data)
}

// 删除分类
export const deleteCategory = (id: number) => {
  return http.delete<ApiResponse<void>>(`/setting/categories/${id}`)
}