import http from './request'
// 登录请求参数
export interface LoginRequest {
  username: string
  password: string
}
// 登录响应参数
export interface LoginResponse {
  code: number
  data: {
    token: string
    username: string
  }
  message: string
}
// 登录接口
export const loginApi = (data: LoginRequest) => {
  return http.post<LoginResponse>('/auth/login', data)
}
// 注册请求参数
export interface RegisterRequest {
  username: string
  password: string
}
// 注册响应参数
export interface RegisterResponse {
  code: number
  data: null
  message: string
}
// 注册接口
export const registerApi = (data: RegisterRequest) => {
  return http.post<RegisterResponse>('/auth/register', data)
}