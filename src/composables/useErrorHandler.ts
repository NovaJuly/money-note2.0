// 统一错误处理
import { AxiosError } from "axios";
import { ElMessage, ElNotification } from "element-plus";

export function useErrorHandler() {
  // 根据错误对象分类处理
  function handleError(error: unknown) {
    // 1. 先判断 Axios 错误（网络/超时/HTTP 错误）
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
    // 2. 如果已经是后端返回的业务对象（有 code/message）
    if (isBusinessError(error)) {
      showBusinessError(error.message);
      return;
    }
    // 3. 其他未知错误
    ElMessage.error("操作失败,请联系管理员");
    console.error("未知错误:", error);
  }

  function isBusinessError(e: any): e is { code: number; message: string } {
    return e && typeof e === 'object' && typeof e.code === 'number' && typeof e.message === 'string'
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
