import { ref, onMounted, onUnmounted } from "vue";
import http from "@/api/request";

export const isBackendOnline = ref(true); // 乐观初始

let timer: number | null = null;
let consecutiveFailures = 0;
const MAX_FAILURES = 2;

async function checkHealth() {
  try {
    // 发送一个GET请求到/health检查接口
    await http.get("/health", { timeout: 3000 });
    consecutiveFailures = 0;
    isBackendOnline.value = true;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status
      // 服务器返回了响应，但根据状态码判断是否真的可用
      if (status === 502 || status === 503 || status === 504) {
        // 网关错误、服务不可用 → 直接视为离线
        consecutiveFailures = 0 // 明确离线，重置连续失败计数（因为已经确定了状态）
        isBackendOnline.value = false
      } else {
        // 其他状态码（如 401/403/404/500）→ 服务器在线（能正常返回响应）
        consecutiveFailures = 0
        isBackendOnline.value = true
      }
    } else {
      // 无响应 → 网络不通或服务器宕机
      consecutiveFailures++
      if (consecutiveFailures >= MAX_FAILURES) {
        isBackendOnline.value = false
      }
    }
  }
}

function startHeartbeat() {
  // 已经在跑就不要再起一个：timer 是模块级单变量，
  // 多个组件各调用一次会互相覆盖引用，导致前一个定时器永远清不掉
  if (timer !== null) return;
  checkHealth(); // 立即检测
  timer = window.setInterval(checkHealth, 20_000); // 20秒一次
}

function stopHeartbeat() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function onBrowserOnline() {
  consecutiveFailures = 0; // 网络恢复，重置计数
  checkHealth(); // 立刻尝试连接
  // 这里也可以触发离线队列同步
}

// 记录有多少个组件正在使用心跳
let refCount = 0;

export function useServerStatus() {
  onMounted(() => {
    refCount++;
    startHeartbeat();
    window.addEventListener("online", onBrowserOnline);
  });

  onUnmounted(() => {
    refCount--;
    window.removeEventListener("online", onBrowserOnline);
    // 只有最后一个使用者卸载后才真正停掉心跳
    if (refCount <= 0) {
      refCount = 0;
      stopHeartbeat();
    }
  });

  return { isBackendOnline };
}
