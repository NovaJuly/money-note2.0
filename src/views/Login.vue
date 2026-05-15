<template>
  <div class="login-page">
    <AuthLayout
      title="欢迎回来"
      subtitle="登录你的记账本"
      :background="bgImage"
    >
      <template #form>
        <el-form
          :model="formData"
          label-position="top"
          :rules="rules"
          ref="formRef"
        >
          <el-form-item label="用户名">
            <el-input
              v-model="formData.username"
              placeholder="请填写用户名"
              size="large"
              prefix-icon="Message"
            />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="formData.password"
              type="password"
              placeholder="••••••••"
              size="large"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <!-- 验证码 -->
          <el-form-item label="验证码" prop="captcha">
            <el-row :gutter="10" style="width: 100%">
              <el-col :span="14">
                <el-input
                  v-model="formData.captcha"
                  placeholder="请输入右侧验证码"
                  size="large"
                  prefix-icon="CircleCheck"
                />
              </el-col>
              <el-col :span="10">
                <div class="captcha-box" @click="refreshCaptcha">
                  {{ captchaCode }}
                </div>
              </el-col>
            </el-row>
          </el-form-item>
          <el-button
            type="primary"
            size="large"
            style="width: 100%; margin-top: 16px"
            @click="handleLogin"
            :loading="loading"
            :disabled="!isFormValid"
          >
            登录
          </el-button>
        </el-form>
      </template>
      <template #footer>
        <div class="footer-links">
          <span>还没有账号？</span>
          <router-link to="/register">立即注册</router-link>
        </div>
        <div class="demo-tip">
          <el-divider>管理员账号</el-divider>
          <p>demo_001 / 123456</p>
          <!-- 一键填充按钮 -->
          <el-button
            type="success"
            plain
            size="small"
            @click="fillDemoAccount"
            style="margin-top: 8px; width: 100%"
          >
            一键填充演示账号
          </el-button>
        </div>
      </template>
    </AuthLayout>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useUserStore } from "@/stores/user";
import AuthLayout from "@/components/AuthLayout.vue";
import { useThrottleFn, useDebounceFn } from "@vueuse/core";
import bgImage from "@/assets/bg.png";
import { useRecordsStore } from "@/stores/records";
import { useErrorHandler } from '@/composables/useErrorHandler'
const { handleError } = useErrorHandler()
import { useCategoriesStore } from "@/stores/categories";
const categoryStore = useCategoriesStore();

const recordsStore = useRecordsStore();

const userStore = useUserStore();
const router = useRouter();
const loading = ref(false);
const formRef = ref<FormInstance>();
const isFormValid = ref(false);
const formData = reactive({
  username: "",
  password: "",
  captcha: "",
});

// 一键填充演示账号
const DemoAccount = () => {
  formData.username = "demo_001";
  formData.password = "123456";
  formData.captcha = captchaCode.value;
   ElMessage.success("已填充演示账号，请输入验证码");
};
const fillDemoAccount = useThrottleFn(DemoAccount, 3000); //节流3秒

// 校验按钮表单，更新 isFormValid
const checkForm = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    isFormValid.value = true;
  } catch {
    isFormValid.value = false;
  }
};

const debouncedCheckForm = useDebounceFn(checkForm, 200);
// 监听表单数据变化，触发校验
watch(() => formData, debouncedCheckForm, { deep: true });

// 验证码逻辑
const captchaCode = ref(generateCaptcha());
function generateCaptcha() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}
const refreshCaptcha = () => {
  captchaCode.value = generateCaptcha();
};

// 表单校验规则
const rules: FormRules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码不能为空,长度至少 6 位", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: "密码只能包含字母、数字和下划线",
      trigger: "blur",
    },
  ],
  captcha: [
    { required: true, message: "请输入验证码", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (value.toUpperCase() !== captchaCode.value.toUpperCase()) {
          callback(new Error("验证码错误"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

const doLogin = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    loading.value = true;
    const result = await userStore.login(
      formData.username.trim(),
      formData.password.trim(),
    );
    loading.value = false;
    if (result.success) {
      ElMessage.success(result.message);
      // ✨ 登录成功后立即同步账单和分类数据
      try {
        await Promise.all([
          recordsStore.fetchFromServer(),
          categoryStore.loadCategories(),
        ])
        console.log("登录成功后立即同步账单和分类数据")
      } catch (e) {
        console.warn('首次数据同步失败，稍后可在页面内重试', e)
      }
      router.push("/dashboard");
    } else {
      // ElMessage.error(result.message);
      handleError(result)
      refreshCaptcha();
    }
    console.log("登录结果", result);
    console.log("当前userStore", userStore);
  });
};

// 节流
const handleLogin = useThrottleFn(doLogin, 1000);
</script>

<style scoped>
.login-page {
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
.footer-links {
  margin-bottom: 16px;
}

.footer-links a {
  color: #1c264e;
  font-weight: 500;
  text-decoration: none;
  margin-left: 6px;
}

.demo-tip {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #6c757d;
}

.demo-tip p {
  font-family: monospace;
  margin-top: 8px;
}
.captcha-box {
  height: 40px;
  line-height: 40px;
  text-align: center;
  background: #f0f2f5;
  border-radius: 6px;
  font-family: monospace;
  font-size: 18px;
  letter-spacing: 4px;
  cursor: pointer;
  user-select: none;
  /* transition: background 0.2s; */
}
.captcha-box:hover {
  background: #e4e7ed;
}
</style>
