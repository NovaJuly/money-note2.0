import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { loginApi, registerApi } from "@/api/auth";
import axios from "axios";

// 用户信息接口
export interface User {
  username: string;
}

// 预设测试账号
const DEMO_USER: User = {
  username: "demo_001",
};
const DEMO_PASSWORD = "123456";

const offlineCredentials=ref<{username:string,password:string} | null>(null)

export const useUserStore = defineStore(
  "user",
  () => {
    // --- 状态 ---
    const token = ref<string | null>(null);
    const currentUser = ref<User | null>(null);
    // 是否已登录（派生状态）
    const isLoggedIn = computed(() => !!token.value && !!currentUser.value);

    // 初始化时确保演示账号存在
    const ensureDemoUserExists = () => {
      const users = getStoredUsers();
      if (!users[DEMO_USER.username]) {
        users[DEMO_USER.username] = {
          password: DEMO_PASSWORD,
          user: DEMO_USER,
        };
        saveStoredUsers(users);
      }
    };
    // 本地存储逻辑(离线模式)
    const getStoredUsers = (): Record<
      string,
      { password: string; user: User }
    > => {
      const stored = localStorage.getItem("registered_users");
      return stored ? JSON.parse(stored) : {};
    };

    // 保存已注册用户到 localStorage
    const saveStoredUsers = (
      users: Record<string, { password: string; user: User }>,
    ) => {
      localStorage.setItem("registered_users", JSON.stringify(users));
    };

    // --- 认证方法(离线模式) ---
    // 用户注册(离线模式)
    const localRegister = (
      username: string,
      password: string,
    ): { success: boolean; message: string } => {
      // 简单校验
      if (!username.trim()) {
        return { success: false, message: "用户名不能为空" };
      }
      if (!password.trim()) {
        return { success: false, message: "密码不能为空" };
      }
      // if (password.trim().length < 6) {
      //   return { success: false, message: "密码至少需要6位" };
      // }

      // 保护演示账号不被覆盖
      if (username === DEMO_USER.username) {
        return { success: false, message: "演示账号已占用，请使用其他用户名" };
      }

      const users = getStoredUsers();

      // 检查用户名是否已被注册
      if (users[username]) {
        return { success: false, message: "该用户名已被注册" };
      }

      // 创建新用户
      const newUser: User = {
        username,
      };

      users[username] = { password, user: newUser };
      saveStoredUsers(users);

      return { success: true, message: "注册成功(离线模式)" };
    };
    // 用户登录(离线模式)
    const localLogin = (
      username: string,
      password: string,
    ): { success: boolean; message: string } => {
      ensureDemoUserExists(); // 确保演示账号一定存在

      const users = getStoredUsers();
      const userRecord = users[username];

      // 校验邮箱和密码
      if (!userRecord) {
        return { success: false, message: "账号不存在" };
      }

      if (userRecord.password !== password) {
        return { success: false, message: "密码错误" };
      }

      // 登录成功，设置状态和离线凭证
      offlineCredentials.value={username,password}
      token.value = `token-local-${Date.now()}-${username}`;
      currentUser.value = userRecord.user;

      // 持久化到 localStorage
      return { success: true, message: "登录成功(离线模式)" };
    };

    /*
      后端认证方法
     */
    // 用户登录(后端模式)
    const login = async (
      username: string,
      password: string,
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const res: any = await loginApi({ username, password });
        console.log("=== 登录调试 ===");
        console.log("后端完整响应:", res);
        console.log("res.data:", res.data);
        console.log("res.code:", res.code);
        console.log("res.data.token:", res.data?.token);
        console.log("res.data.user:", res.data?.user);
        if (res.code === 10000) {
          token.value = res.data.token;
          currentUser.value = res.data.user;
          return { success: true, message: "登录成功(后端模式)" };
        } else {
          return {
            success: false,
            message: res.message || "登录失败(后端模式)",
          };
        }
      } catch (error: any) {
        // 1. 如果是 Axios 网络错误，或者拦截器包装后的离线错误（code === 999），直接降级
        if (axios.isAxiosError(error) && !error.response) {
          console.warn("后端 API 不可用，切换到本地验证");
          return localLogin(username, password);
        }

        // 2. 如果是后端返回的 5xx（502/503）等，也应该降级（后端不可用）
        if (error?.response?.status >= 500) {
          console.warn("后端服务异常，切换到本地验证");
          return localLogin(username, password);
        }

        // 3. 如果拦截器把网络错误包装成了 { code: 999, message: '...' }
        if (error && error.code === 999) {
          console.warn("后端不可用（包装错误），切换到本地验证");
          return localLogin(username, password);
        }

        // 4. 其他任何有 response 的 HTTP 错误（4xx 等），不降级，展示后端消息
        if (error?.response?.data) {
          const data = error.response.data;
          return { success: false, message: data.message || "请求失败" };
        }

        // 5. 最终兜底：也降级
        console.warn("未知错误，尝试本地登录", error);
        return localLogin(username, password);
      }
    };

    // 用户注册(后端模式)
    const register = async (
      username: string,
      password: string,
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const res: any = await registerApi({ username, password });
        console.log(res);

        if (res.code === 10000) {
          return { success: true, message: res.message || "注册成功" };
        } else if (res.code === 10001) {
          return { success: false, message: res.message || "用户名已存在" };
        } else {
          return { success: false, message: res.message || "注册失败" };
        }
      } catch (error: any) {
        console.log("catch触发", error, "有response吗？", !!error?.response);

        // 只要 error.response 存在（且状态码不等于0），说明是服务器返回的错误（400/500等）
        if (error?.response?.status >= 400) {
          const message = error.response.data?.message || "请求失败";
          return { success: false, message };
        }

        // 否则就是网络错误、超时、DNS 错误等 → 降级
        console.warn("后端 API 不可用，切换到本地注册");
        return localRegister(username, password); // 或 localRegister
      }
    };

    // 退出登录
    const logout = () => {
      token.value = null;
      currentUser.value = null;
      offlineCredentials.value=null
    };

    // 初始化时确保演示账号存在
    ensureDemoUserExists();

    return {
      // 状态
      token,
      currentUser,
      isLoggedIn,
      offlineCredentials,

      // 方法
      localRegister,
      localLogin,
      logout,
      login,
      register,
    };
  },
  {
    // 持久化配置：只持久化需要保留的状态
    persist: {
      key: "user-store",
      paths: ["token", "currentUser"],
    } as any,
  },
);
