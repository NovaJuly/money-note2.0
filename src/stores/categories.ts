import { defineStore } from "pinia";
import { ref } from "vue";
import * as categoriesApi from "@/api/categories";
import { ElMessage } from "element-plus";
import type { CategoryItem } from "@/api/categories";

// 默认支出分类
export const EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 1, name: '餐饮', icon: 'Food', type: 'expense' },
  { id: 2, name: '交通', icon: 'Place', type: 'expense' },
  { id: 3, name: '购物', icon: 'ShoppingCart', type: 'expense' },
  { id: 4, name: '消费', icon: 'Wallet', type: 'expense' },
  { id: 5, name: '娱乐', icon: 'SwitchFilled', type: 'expense' },
  { id: 6, name: '医疗', icon: 'Help', type: 'expense' },
  { id: 7, name: '教育', icon: 'School', type: 'expense' },
  { id: 8, name: '转账', icon: 'Present', type: 'expense' },
  { id: 9, name: '通讯', icon: 'PhoneFilled', type: 'expense' },
  { id: 10, name: '其他', icon: 'More', type: 'expense' },
]

// 默认收入分类
export const INCOME_CATEGORIES: CategoryItem[] = [
  { id: 11, name: '工资', icon: 'Money', type: 'income' },
  { id: 12, name: '转账', icon: 'Present', type: 'income' },
  { id: 13, name: '理财', icon: 'TrendCharts', type: 'income' },
  { id: 14, name: '退款', icon: 'Wallet', type: 'income' },
  { id: 15, name: '其他', icon: 'More', type: 'income' },
]
// 默认分类 ID 列表（用于保护，不可删除编辑）
export const DEFAULT_EXPENSE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const DEFAULT_INCOME_IDS = [11, 12, 13, 14, 15];

export const useCategoriesStore = defineStore('categories', () => {
  const expenseCategories = ref<CategoryItem[]>([])
  const incomeCategories = ref<CategoryItem[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function loadCategories() {
    if (loading.value) return
    loading.value = true
    try {
      const res = await categoriesApi.fetchCategories()
      if (res.code === 10000) {
        const all = res.data.filter(c => c && c.name)
        expenseCategories.value = all.filter(c => c.type === 'expense')
        incomeCategories.value = all.filter(c => c.type === 'income')
        loaded.value = true
      } else {
        console.warn('加载分类返回非10000:', res)
      }
    } catch (e) {
      console.warn('加载分类失败，使用上次缓存或默认值', e)
      if (expenseCategories.value.length === 0) {
        expenseCategories.value = [...EXPENSE_CATEGORIES]
      }
      if (incomeCategories.value.length === 0) {
        incomeCategories.value = [...INCOME_CATEGORIES]
      }
    } finally {
      loading.value = false
    }
  }

  async function addCategory(type: 'expense' | 'income', name: string, icon = 'MoreFilled') {
    try {
      const res = await categoriesApi.createCategory({ name, icon, type })
      if (res.code === 10000) {
        await loadCategories()
        ElMessage.success('分类已添加')
      } else {
        // 业务错误，直接显示后端消息
        throw new Error(res.message || '添加失败')
      }
    } catch (error: any) {
      ElMessage.error(error.message || '添加失败')
      throw error // 重新抛出，让组件可以处理（如关闭 loading）
    }
  }

  async function deleteCategory(id: number) {
    if (DEFAULT_EXPENSE_IDS.includes(id) || DEFAULT_INCOME_IDS.includes(id)) {
      ElMessage.warning('默认分类不能删除')
      return
    }
    try {
      const res = await categoriesApi.deleteCategory(id)
      if (res.code === 10000) {
        await loadCategories()
        ElMessage.success('分类已删除')
      } else {
        throw new Error(res.message || '删除失败')
      }
    } catch (error: any) {
      ElMessage.error(error.message || '删除失败')
      throw error
    }
  }

  async function updateCategory(id: number, data: { name?: string; icon?: string }) {
    if (DEFAULT_EXPENSE_IDS.includes(id) || DEFAULT_INCOME_IDS.includes(id)) {
      ElMessage.warning('默认分类不能编辑')
      return
    }
    try {
      const res = await categoriesApi.updateCategory(id, data)
      if (res.code === 10000) {
        await loadCategories()
        ElMessage.success('分类已更新')
      } else {
        throw new Error(res.message || '编辑失败')
      }
    } catch (error: any) {
      ElMessage.error(error.message || '编辑失败')
      throw error
    }
  }

  function isDefaultCategory(id: number) {
    return DEFAULT_EXPENSE_IDS.includes(id) || DEFAULT_INCOME_IDS.includes(id)
  }

  return {
    expenseCategories,
    incomeCategories,
    loading,
    loaded,
    loadCategories,
    addCategory,
    deleteCategory,
    updateCategory,
    isDefaultCategory,
  }
})