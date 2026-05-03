<template>
  <div class="register-page">
    <AuthLayout
      title="创建账号"
      subtitle="开始管理你的财务"
      :background="bgImage"
    >
      <template #form>
        <el-form
          :model="form"
          label-position="top"
          ref="formRef"
          :rules="rules"
          status-icon
        >
          <!-- 用户名 -->
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="form.username"
              placeholder="您的昵称"
              size="large"
              prefix-icon="User"
            />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="至少6位"
              size="large"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              placeholder="再次输入密码"
              size="large"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <!-- 同意协议复选框 -->
          <el-form-item prop="agree">
            <el-checkbox v-model="form.agree">
              我已阅读并同意
              <el-link class="custom-link" @click.stop="showAgreement = true"
                >《用户协议》</el-link
              >
              和
              <el-link class="custom-link" @click.stop="showAgreement = true"
                >《隐私政策》</el-link
              >
            </el-checkbox>
          </el-form-item>

          <el-button
            type="primary"
            size="large"
            style="width: 100%; margin-top: 16px"
            @click="handleRegister"
            :loading="loading"
            :disabled="!isFormValid"
          >
            注册
          </el-button>
        </el-form>
      </template>

      <template #footer>
        <div class="footer-links">
          <span>已有账号？</span>
          <router-link to="/login">立即登录</router-link>
        </div>
      </template>
    </AuthLayout>
    <el-dialog v-model="showAgreement" title="用户协议与隐私政策" width="500px">
      <div style="max-height: 300px; overflow-y: auto">
        <p>这里是用户协议内容</p>
        <p>1. 您必须年满18周岁才能使用本服务。(不满也可)</p>
        <p>2. 请妥善保管您的账号密码。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showAgreement = false"
          >关闭</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ElMessage,
  ElDialog,
  type FormInstance,
  type FormRules,
} from "element-plus";
import { useUserStore } from "@/stores/user";
import AuthLayout from "@/components/AuthLayout.vue";
import { useThrottleFn, useDebounceFn } from "@vueuse/core";
import bgImage from "@/assets/bg.png";

const router = useRouter();
const userStore = useUserStore();
const formRef = ref<FormInstance>();
const loading = ref(false);
const showAgreement = ref(false);

const form = reactive({
  username: "",
  password: "",
  confirmPassword: "",
  agree: false,
});

const isFormValid = ref(false);
// 按钮校验
const checkForm = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    isFormValid.value = true;
  } catch {
    isFormValid.value = false;
  }
};
// 防抖校验按钮
const debouncedCheckForm = useDebounceFn(checkForm, 200);
watch(() => form, debouncedCheckForm, { deep: true });

// 密码校验
const validatePass = (rule: any, value: string, callback: any) => {
  if (value !== form.password) {
    callback(new Error("两次输入的密码不一致"));
  } else {
    callback();
  }
};
// 定义规则
const rules: FormRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 2, max: 10, message: "长度在 2 到 10 个字符", trigger: "blur" },
    {
      pattern: /^\S+$/,
      message: "用户名不能包含空格",
      trigger: "blur",
    },
    {
      pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
      message: "用户名只能包含字母、数字、下划线和中文",
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度至少 6 位", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: "密码只能包含字母、数字和下划线",
      trigger: "blur",
    },
  ],
  confirmPassword: [
    { required: true, message: "请再次输入密码", trigger: "blur" },
    { validator: validatePass, trigger: "blur" },
  ],
  agree: [
    {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error("请先阅读并同意用户协议"));
        } else {
          callback();
        }
      },
      trigger: "change",
    },
  ],
};

const doRegister = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.warning("请正确填写所有信息");
      return;
    }
    loading.value = true;
    // 调用 store 的 register 方法（需要传递 username）
    const result = await userStore.register(
      form.username.trim(),
      form.password.trim(),
    );
    loading.value = false;

    if (result.success) {
      ElMessage.success(result.message);
      router.push("/login");
    } else {
      ElMessage.error(result.message);
    }
  });
};
const handleRegister = useThrottleFn(doRegister, 1000);
</script>

<style scoped>
.register-page {
  background-image: url("@/assets/bg.png");
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
}
.el-form-item {
  background: transparent;
}
:deep(.el-form-item__label) {
  color: #fff;
}
.footer-links a {
  color: #8ab4f8;
  font-weight: 500;
  text-decoration: none;
  margin-left: 6px;
}

/* 自定义链接样式，代替默认的 primary 蓝色 */
.custom-link {
  color: #8ab4f8 !important;
  text-decoration: none;
  margin: 0 4px;
}

.custom-link:hover {
  color: #aed6f1 !important;
  text-decoration: underline;
}

:deep(.el-checkbox__label) {
  color: #fff;
}

.el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: #667eea;
  border-color: #435191;
}
</style>
