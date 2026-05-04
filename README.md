# 记一笔 · 财务手账

[![Vue 3](https://img.shields.io/badge/Vue-3.5+-4fc08d?logo=vuedotjs)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Pinia](https://img.shields.io/badge/Pinia-2.x-ffd900?logo=pinia)](https://pinia.vuejs.org)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.x-409eff?logo=elementplus)](https://element-plus.org)

一个支持**后端优先、离线可用**的全栈记账应用。\
帮助你轻松记录日常收支、管理分类、导入微信账单，所有数据安全存储在你的服务器上。

***

## ✨ 功能特性

### 🔐 用户认证

- 邮箱 + 密码登录 / 注册，表单实时校验
- 一键填充演示账号 (`demo@example.com`)
- **后端 JWT 认证**，请求自动携带 `Authorization` 头
- **智能降级**：后端不可用时自动切换本地模拟登录，确保任何时候都能使用

### 📊 记账仪表盘

- 当月收入、支出、结余统计卡片，颜色区分
- **每日明细卡片**：同一天记录合并展示，包含当日小计
- **无限滚动分页**加载历史记录
- 右侧**浮动导航面板**：快速切换月份、查看当月收支、一键回到今天
- 每条记录清晰展示分类图标、金额、时间、备注，支持编辑和删除

### 📝 记账表单

- 支出 / 收入快速切换，分类下拉带图标
- 金额支持**滚轮微调**，日期快速选择
- **Markdown 备注**编辑器，实时预览，自动生成纯文本摘要
- 编辑记录时保留原有数据，支持修改类型、金额、分类、日期

### 🏷️ 分类管理

- 内置一批**默认分类**（餐饮、交通、购物等），不可删除
- **自定义分类**：可添加、修改、删除，自由选择图标
- 所有分类数据通过后端接口持久化，多端同步

### 📥 微信账单导入（特色功能）

- 支持 **微信支付导出的 Excel 账单**一键导入
- 自动识别交易类型、金额、时间、交易对方
- 智能推断分类：根据交易对方、商品名称自动归类
- **预览与勾选**：导入前可预览数据，自由选择要导入的记录
- 批量提交后端，实时返回成功 / 失败统计

### 🧩 更多细节

- 登录成功后自动同步账单和分类数据，无需等待
- 同一天记录自动合并到同一卡片，日期分组准确
- 响应式布局，适配不同屏幕（部分页面待优化）
- Element Plus 组件深度定制，视觉清爽

***

## 🛠️ 技术栈

| 类别   | 技术                                                             |
| ---- | -------------------------------------------------------------- |
| 前端框架 | Vue 3 (Composition API + `<script setup>`)                     |
| 语言   | TypeScript                                                     |
| 构建工具 | Vite                                                           |
| 状态管理 | Pinia + persist 插件                                             |
| UI 库 | Element Plus                                                   |
| 路由   | Vue Router 4                                                   |
| 工具库  | dayjs, nanoid, @vueuse/core, axios, xlsx, marked, highlight.js |
| 后端   | 项目待上传                                                          |

***

## 📦 快速开始

### 前提条件

- **Node.js** >= 18.0.0（推荐 20 LTS）
- **包管理器**：npm >= 9、pnpm >= 8 或 yarn >= 1.22
- **浏览器**：Chrome 90+、Edge 90+、Firefox 88+ 或 Safari 14+
- 项目基于以下核心库，请确保安装的版本兼容：
  - Vue 3.5+
  - Vite 5.4+
  - TypeScript 5.5+
  - Pinia 2.2+
  - Element Plus 2.9+

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/NovaJuly/money-note2.0.git
cd money-note2.0

# 安装依赖
npm install   # 或 pnpm install

# 启动开发服务器
npm run dev

# 构建生产包
npm run build
```

### 环境变量

在项目根目录创建 `.env.development` 文件：

```env
# 后端 API 地址（开发环境）
VITE_API_BASE_URL=http://localhost:8080/api
# 若使用 Vite 代理，这里可以填 /api 并在 vite.config.ts 中配置 proxy
```

生产环境配置 `.env.production`：

```env
VITE_API_BASE_URL=https://your-server.com/api
```

***

## 📁 项目结构

```
src/
├── api/                # 后端接口封装 (request.ts, auth.ts, records.ts, categories.ts)
├── assets/             # 静态资源
├── components/         # 可复用组件
│   ├── AuthLayout.vue
│   ├── StatsCard.vue
│   ├── RecordForm.vue
│   ├── RecordList.vue
│   ├── MarkdownEditor.vue
│   └── ...
├── stores/             # Pinia 状态管理
│   ├── user.ts
│   └── records.ts
├── utils/              # 工具函数（微信账单解析等）
│   ├── wechatBillParser.ts
│   └── markdown.ts
├── views/              # 页面组件
│   ├── Login.vue
│   ├── Register.vue
│   ├── Dashboard.vue
│   ├── Accounting.vue
│   ├── Settings.vue
│   └── Reports.vue
├── router/             # 路由配置
│   └── index.ts
├── App.vue
└── main.ts
```

***

## 🔌 后端 API 说明

本项目前端已完整对接后端接口，所有请求遵循统一格式：

```json
{
  "code": 10000,
  "message": "成功",
  "data": { ... }
}
```

主要接口：

- `POST /api/auth/login` – 登录
- `POST /api/auth/register` – 注册
- `GET /api/categories` – 获取分类列表
- `POST /api/categories` – 创建分类
- `PUT /api/categories/:id` – 更新分类
- `DELETE /api/categories/:id` – 删除分类
- `POST /api/records` – 添加记录
- `GET /api/records` – 获取记录列表
- `PUT /api/records/:id` – 更新记录
- `DELETE /api/records/:id` – 删除记录
- `POST /api/records/import` – 批量导入记录

详细接口文档请参考后端项目（若已独立）或与后端开发人员协商。

***

## 🧪 演示账号

可在登录页一键填充以下账号进行体验：

- 邮箱：`demo@example.com`
- 密码：`123456`

（仅限后端服务正常时；若后端离线，将自动切换为本地模式，任何注册的账号均可使用）

***

## 🚀 待办事项 / Roadmap

- [ ] 数据导出（JSON / CSV）
- [ ] 账号管理（修改密码、注销）
- [ ] 离线记录缓存与自动同步
- [ ] 深色模式
- [ ] 移动端适配优化

欢迎提交 Issue 或 Pull Request！

***

**谢谢 ⭐ Star 喵**
