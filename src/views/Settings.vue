<template>
  <div class="settings-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 账号管理 -->
      <el-tab-pane label="账号管理" name="account">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户名">{{
            userStore.currentUser?.username
          }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{
            userStore.currentUser?.createdAt
          }}</el-descriptions-item>
        </el-descriptions>
        <el-button type="primary" @click="refreshData">强制刷新数据</el-button>
      </el-tab-pane>
      <!-- 分类管理 -->
      <el-tab-pane label="分类管理" name="category">
        <div class="tab-content">
          <!-- 支出分类 -->
          <div class="section-header">
            <h3>支出分类</h3>
            <el-button
              type="primary"
              size="small"
              @click="addCategory('expense')"
            >
              <el-icon><Plus /></el-icon> 添加支出分类
            </el-button>
          </div>
          <el-table
            :data="expenseCategories"
            v-loading="loading"
            style="width: 100%"
          >
            <el-table-column prop="name" label="分类名称" />
            <el-table-column prop="icon" label="图标" width="100">
              <template #default="{ row }">
                <el-icon><component :is="row.icon" /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <template v-if="!isDefaultCategory(row.id)">
                  <el-button type="primary" link @click="editCategory(row)"
                    >编辑</el-button
                  >
                  <el-button type="danger" link @click="deleteCategory(row.id)"
                    >删除</el-button
                  >
                </template>
                <template v-else>
                  <el-button disabled>默认分类不能编辑</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>

          <!-- 收入分类 -->
          <div class="section-header" style="margin-top: 30px">
            <h3>收入分类</h3>
            <el-button
              type="primary"
              size="small"
              @click="addCategory('income')"
            >
              <el-icon><Plus /></el-icon> 添加收入分类
            </el-button>
          </div>
          <el-table
            :data="incomeCategories"
            v-loading="loading"
            style="width: 100%"
          >
            <el-table-column prop="name" label="分类名称" />
            <el-table-column prop="icon" label="图标" width="100">
              <template #default="{ row }">
                <el-icon><component :is="row.icon" /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <template v-if="!isDefaultCategory(row.id)">
                  <el-button type="primary" link @click="editCategory(row)"
                    >编辑</el-button
                  >
                  <el-button type="danger" link @click="deleteCategory(row.id)"
                    >删除</el-button
                  >
                </template>
                <template v-else>
                  <el-button disabled>默认分类不能编辑</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 数据导入与导出 -->
      <el-tab-pane label="数据导入" name="import-export">
        <el-card header="导入微信账单" style="margin-top: 16px">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :on-change="handleFileChange"
            :limit="1"
            accept=".xlsx"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将微信账单文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .xlsx 文件，微信支付导出的账单格式
              </div>
            </template>
          </el-upload>
        </el-card>
        <!-- 预览表格 -->
        <el-card
          v-if="showPreview"
          header="预览导入数据"
          style="margin-top: 16px"
        >
          <el-table
            :data="importedRecords"
            max-height="400"
            style="width: 100%"
          >
            <el-table-column prop="selected" label="选择" width="50">
              <template #default="{ row }">
                <el-checkbox v-model="row.selected" />
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="70">
              <template #default="{ row }">
                <el-tag
                  :type="row.record.type === 'income' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.record.type === "income" ? "收入" : "支出" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }"
                >¥{{ row.record.amount.toFixed(2) }}</template
              >
            </el-table-column>
            <el-table-column prop="record.category" label="分类" width="100" />
            <el-table-column prop="record.date" label="日期" width="120" />
            <el-table-column prop="record.note" label="备注" min-width="180" />
          </el-table>

          <div style="margin-top: 12px; display: flex; gap: 12px">
            <el-button
              type="primary"
              :loading="importing"
              @click="confirmImport"
            >
              确认导入 {{ importedRecords.length }} 条记录
            </el-button>
            <el-button @click="cancelPreview">取消</el-button>
          </div>
        </el-card>
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
        <el-button type="primary" @click="saveCategory" :loading="saving"
          >保存</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import * as categoriesApi from "@/api/categories";
import * as recordsApi from "@/api/record";
import { useRecordsStore } from "@/stores/records";
import { CATEGORY_ICON_OPTIONS } from "@/utils/icons";
import { useUserStore } from "@/stores/user";
import { type WechatBill, parseWechatBill } from "@/utils/wechatBillParser";

const recordsStore = useRecordsStore();
const userStore = useUserStore();
const rawRecords = ref<WechatBill[]>([]);
const importedRecords = ref<{ record: WechatBill; selected: boolean }[]>([]);

// 文件解析
const importFile = ref<File | null>(null);
const showPreview = ref(false);
const importing = ref(false);
const refreshData = async () => {
  await recordsStore.loadRecords();
  await categoriesApi.fetchCategories();
};
const handleFileChange = async (uploadFile: any) => {
  const file = uploadFile.raw;
  if (!file) return;

  try {
    const records = await parseWechatBill(file);
    console.log(records);
    importedRecords.value = records.map((record) => ({
      record,
      selected: true,
    }));
  } catch (e: any) {
    ElMessage.error(e.message || "解析失败");
  } finally {
    showPreview.value = true;
  }
};
const confirmImport = async () => {
  if (importing.value) return;
  const selected = importedRecords.value
    .filter((r) => r.selected)
    .map((r) => r.record);
  if (selected.length === 0) {
    ElMessage.warning("请至少选择一条记录");
    return;
  }

  importing.value = true;
  try {
    // 调用后端批量导入接口
    const res = await recordsApi.importRecords(selected);
    if (res.code === 10000) {
      const { successCount, failCount } = res.data || {};
      ElMessage.success(
        `导入完成：成功 ${successCount ?? selected.length} 条${failCount ? "，失败 " + failCount + " 条" : ""}`,
      );
      showPreview.value = false;
      importedRecords.value = [];
      // 可选：刷新记录列表
      await recordsStore.loadRecords();
    } else {
      ElMessage.error(res.message || "导入失败");
    }
  } catch (e: any) {
    ElMessage.error(e.message || "导入失败");
  } finally {
    importing.value = false;
  }
};

const cancelPreview = () => {
  showPreview.value = false;
  importedRecords.value = [];
};
// 标签页
const activeTab = ref("account");

// 对话框状态
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const currentType = ref<"expense" | "income">("expense");
const editId = ref<number | null>(null);

const form = ref({
  name: "",
  icon: "MoreFilled",
});

// 从 store 获取分类
const expenseCategories = computed(() => recordsStore.expenseCategories);
const incomeCategories = computed(() => recordsStore.incomeCategories);
const loading = ref(false);
const isDefaultCategory = (id: number) => {
  return id <= 15;
};
// 初始化加载分类
onMounted(async () => {
  if (!recordsStore.categoriesLoaded) {
    loading.value = true;
    await recordsStore.loadCategories();
    loading.value = false;
  }
});

// 添加分类
const addCategory = (type: "expense" | "income") => {
  isEdit.value = false;
  currentType.value = type;
  editId.value = null;
  form.value = { name: "", icon: "MoreFilled" };
  dialogVisible.value = true;
};

// 编辑分类
const editCategory = (row: any) => {
  if (isDefaultCategory(row.id)) {
    ElMessage.warning("默认分类不能编辑");
    return;
  }
  isEdit.value = true;
  currentType.value = row.type;
  editId.value = row.id;
  form.value = { name: row.name, icon: row.icon };
  dialogVisible.value = true;
};

// 保存分类（新增或编辑）
const saveCategory = async () => {
  if (!form.value.name.trim()) {
    ElMessage.warning("分类名称不能为空");
    return;
  }
  // 不能有重复的分类名称
  if (
    expenseCategories.value.some((c) => c.name === form.value.name) ||
    incomeCategories.value.some((c) => c.name === form.value.name)
  ) {
    ElMessage.warning("分类名称不能重复");
    return;
  }
  saving.value = true;
  try {
    if (isEdit.value && editId.value) {
      await categoriesApi.updateCategory(editId.value, form.value);
      ElMessage.success("分类已更新");
    } else {
      await categoriesApi.createCategory({
        ...form.value,
        type: currentType.value,
      });
      ElMessage.success("分类已添加");
    }
    // 重新拉取最新分类列表
    await recordsStore.loadCategories();
    dialogVisible.value = false;
  } catch (error: any) {
    const message = error?.message || "操作失败";
    ElMessage.error(message);
  } finally {
    saving.value = false;
  }
};

// 删除分类
const deleteCategory = async (id: number) => {
  if (isDefaultCategory(id)) {
    ElMessage.warning("默认分类不能删除");
    return;
  }
  ElMessageBox.confirm(
    "确定删除该分类吗？已使用该分类的记录将保持不变。",
    "提示",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    },
  ).then(async () => {
    try {
      await categoriesApi.deleteCategory(id);
      ElMessage.success("分类已删除");
      await recordsStore.loadCategories();
    } catch (error: any) {
      ElMessage.error(error?.message || "删除失败");
    }
  });
};
</script>

<style scoped>
.settings-page {
  max-width: 1000px;
  margin: 20px auto;
}
.tab-content {
  padding: 10px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
</style>
