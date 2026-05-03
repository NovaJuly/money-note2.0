<template>
  <div class="settings-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 账号管理 -->
       <el-tab-pane label="账号管理" name="account">
        <div class="table-content">
          <p>当前账号：{{ userStore.currentUser?.username }}</p>
        </div>
       </el-tab-pane>
      <!-- 分类管理 -->
      <el-tab-pane label="分类管理" name="category">
        <div class="tab-content">
          <!-- 支出分类 -->
          <div class="section-header">
            <h3>支出分类</h3>
            <el-button type="primary" size="small" @click="addCategory('expense')">
              <el-icon><Plus /></el-icon> 添加分类
            </el-button>
          </div>
          <el-table :data="expenseCategories" v-loading="loading" style="width: 100%">
            <el-table-column prop="name" label="分类名称" />
            <el-table-column prop="icon" label="图标" width="100">
              <template #default="{ row }">
                <el-icon><component :is="row.icon" /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button type="primary" link @click="editCategory(row)">编辑</el-button>
                <el-button type="danger" link @click="deleteCategory(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 收入分类 -->
          <div class="section-header" style="margin-top:30px">
            <h3>收入分类</h3>
            <el-button type="primary" size="small" @click="addCategory('income')">
              <el-icon><Plus /></el-icon> 添加分类
            </el-button>
          </div>
          <el-table :data="incomeCategories" v-loading="loading" style="width: 100%">
            <el-table-column prop="name" label="分类名称" />
            <el-table-column prop="icon" label="图标" width="100">
              <template #default="{ row }">
                <el-icon><component :is="row.icon" /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button type="primary" link @click="editCategory(row)">编辑</el-button>
                <el-button type="danger" link @click="deleteCategory(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 数据导入与导出 -->
      <el-tab-pane label="数据导入与导出" name="data">
        <div class="tab-content">
          <el-result
            icon="info"
            title="功能开发中"
            sub-title="数据导入与导出功能即将上线，敬请期待"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加/编辑分类对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分类' : '添加分类'"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="form.icon" placeholder="请选择图标">
            <el-option
              v-for="icon in CATEGORY_ICON_OPTIONS"
              :key="icon"
              :label="icon"
              :value="icon"
            >
              <el-icon><component :is="icon" /></el-icon>
              <span style="margin-left: 8px">{{ icon }}</span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCategory" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import * as categoriesApi from '@/api/categories'
import { useRecordsStore } from '@/stores/records'
import { CATEGORY_ICON_OPTIONS } from '@/utils/icons'
import { useUserStore } from "@/stores/user";

const recordsStore = useRecordsStore()
const userStore = useUserStore()

// 标签页
const activeTab = ref('account')

// 对话框状态
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const currentType = ref<'expense' | 'income'>('expense')
const editId = ref<number | null>(null)

const form = ref({
  name: '',
  icon: 'MoreFilled'
})

// 从 store 获取分类
const expenseCategories = computed(() => recordsStore.expenseCategories)
const incomeCategories = computed(() => recordsStore.incomeCategories)
const loading = ref(false)

// 初始化加载分类
onMounted(async () => {
  if (!recordsStore.categoriesLoaded) {
    loading.value = true
    await recordsStore.loadCategories()
    loading.value = false
  }
})

// 添加分类
const addCategory = (type: 'expense' | 'income') => {
  isEdit.value = false
  currentType.value = type
  editId.value = null
  form.value = { name: '', icon: 'MoreFilled' }
  dialogVisible.value = true
}

// 编辑分类
const editCategory = (row: any) => {
  isEdit.value = true
  currentType.value = row.type
  editId.value = row.id
  form.value = { name: row.name, icon: row.icon }
  dialogVisible.value = true
}

// 保存分类（新增或编辑）
const saveCategory = async () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('分类名称不能为空')
    return
  }
  saving.value = true
  try {
    if (isEdit.value && editId.value) {
      await categoriesApi.updateCategory(editId.value, form.value)
      ElMessage.success('分类已更新')
    } else {
      await categoriesApi.createCategory({
        ...form.value,
        type: currentType.value
      })
      ElMessage.success('分类已添加')
    }
    // 重新拉取最新分类列表
    await recordsStore.loadCategories()
    dialogVisible.value = false
  } catch (error: any) {
    const message = error?.message || '操作失败'
    ElMessage.error(message)
  } finally {
    saving.value = false
  }
}

// 删除分类
const deleteCategory = async (id: number) => {
  ElMessageBox.confirm('确定删除该分类吗？已使用该分类的记录将保持不变。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await categoriesApi.deleteCategory(id)
      ElMessage.success('分类已删除')
      await recordsStore.loadCategories()
    } catch (error: any) {
      ElMessage.error(error?.message || '删除失败')
    }
  })
}
</script>

<style scoped>
.settings-page {
  max-width: 800px;
  margin: 20px auto;
}
.tab-content {
  padding: 20px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
</style>