// 统一错误处理
import { AxiosError } from "axios";
import { ElMessage, ElNotification } from "element-plus";

export function useErrorHandler() {
  // 根据错误对象分类处理
  function handleError(error: unknown) {
    // 1. 先判断 Axios 错误（网络/超时/HTTP 错误）
    //    必须排在 Error 之前：AxiosError 继承自 Error
    if (error instanceof AxiosError) {
      if (error.response) {
        // HTTP 错误（4xx/5xx）：此时后端已返回业务对象，取出来
        const body = error.response.data as any
        if (body && body.message) {
          showBusinessError(body.message)
        } else {
          showHttpError(error.response.status)
        }
      } else {
        // 网络错误（超时、断网等）
        showNetworkError()
      }
      return
    }

    // 2. 业务代码主动 throw 的标准 Error
    //    例如「未找到账单明细表头，请确认是微信支付导出的账单」
    if (error instanceof Error) {
      showBusinessError(error.message)
      return
    }

    // 3. 后端业务对象 / store 返回的结果对象：只要带 message 就原样展示。
    //    注意这里刻意不要求数字型的 code —— 登录/注册返回的是 { success, message }，
    //    导入返回的是 { code, message }，强制要求 code 会把真实原因吞成通用提示。
    const message = extractMessage(error)
    if (message) {
      showBusinessError(message)
      return
    }

    // 4. 其他未知错误
    ElMessage.error("操作失败,请联系管理员");
    console.error("未知错误:", error);
  }

  /** 从各种形态的错误对象里提取可读消息 */
  function extractMessage(e: unknown): string | null {
    if (!e || typeof e !== "object") return null
    const message = (e as any).message
    return typeof message === "string" && message.trim() ? message.trim() : null
  }
  function showBusinessError(msg: string) {
    ElMessage.error(msg || "业务处理失败");
  }
  function showHttpError(status: number) {
    switch (status) {
      case 401:
        ElMessage.error("登录已过期，请重新登录");
        break;
      case 403:
        ElMessage.error("无权限执行此操作");
        break;
      case 404:
        ElMessage.error("请求的资源不存在");
        break;
      case 500:
        ElNotification({
          title: "服务器异常",
          message: "请稍后重试或联系管理员",
          type: "error",
        });
        break;
      default:
        ElMessage.error(`请求失败 (${status})`);
    }
  }
  function showNetworkError() {
    ElMessage.error("网络错误，请检查网络连接");
  }

  return {
    handleError,
  };
}
