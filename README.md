# 记一笔 · 财务手账

[![Vue 3](https://img.shields.io/badge/Vue-3.5+-4fc08d?logo=vuedotjs)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Pinia](https://img.shields.io/badge/Pinia-3.x-ffd900?logo=pinia)](https://pinia.vuejs.org)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.13-409eff?logo=elementplus)](https://element-plus.org)

一个**离线优先（offline-first）**的记账应用。断网时照常记账、数据落在本地，联网后自动补推到服务端。\
支持收支记录、分类管理、微信账单导入、多格式导出与消费报表。\
**未来计划：接入大语言模型，实现自然语言记账、智能分类推荐与消费趋势分析。**

***

## ✨ 功能特性

### 🔐 用户认证

- 用户名 + 密码登录 / 注册，表单实时校验
- 登录页有验证码（**前端生成，仅防误触，不是安全机制**）
- **JWT 认证**：请求自动携带 `Authorization: Bearer <token>`
- **智能降级**：后端不可用时自动切换为本地模式（账号密码存在浏览器 `localStorage`），任何时候都能记账
- 网络恢复后若处于本地模式，会尝试自动重新登录并同步积压数据

### 📊 首页仪表盘

- 当月收入、支出、结余统计卡片
- 每日明细卡片：同一天记录合并展示，含当日收支小计
- 快捷入口：记一笔 / 查看详情 / 查看报表

### 📝 记账页 `/accounting`

- 支出 / 收入切换，分类下拉带图标
- 金额支持**滚轮微调**
- **Markdown 备注**编辑器，实时预览；列表中以纯文本摘要展示
- 页面右上角可一键跳转到明细页

### 📋 明细页 `/records`

- 账单流水列表，支持编辑、删除（删除有二次确认）
- **无限滚动 + 服务端分页**（后端需支持，见下方接口说明）
- 按月份分割，右侧悬浮面板可快速跳转月份、查看当月收支、回到今天

### 📈 报表页 `/reports`

- 周 / 月 / 年 / 自定义区间切换
- 支出分类占比饼图、近 3 期收支对比柱状图
- 收支排行榜、日均支出、环比百分比

### 🏷️ 分类管理

- 内置默认分类，不可删除或编辑：

  | 类型 | 分类 |
  | --- | --- |
  | 支出 | 餐饮、交通、购物、消费、娱乐、医疗、教育、转账、通讯、其他 |
  | 收入 | 工资、转账、理财、退款、其他 |

- 自定义分类可增改删，图标从内置白名单中选择
- 分类数据通过后端接口持久化

### 📥 微信账单导入（特色功能）

- 支持微信支付导出的 **Excel / CSV** 账单
- 自动识别交易时间、类型、金额、交易对方、商品、备注
- 自动推断分类（默认规则：淘宝 / 京东 / 拼多多 → 购物，转账 → 转账，退款 → 退款，其余按收支方向归类）
- **编码自适应**：UTF-8 解码失败时自动回退 GBK
- **预览与勾选**：导入前可逐条勾选
- 批量提交后端，返回成功 / 失败统计

### 📤 数据导出

- 时间范围：本周 / 本月 / 本年 / 全部 / 自定义
- 格式：**Excel / JSON / CSV**（CSV 带 UTF-8 BOM，Excel 打开不乱码）
- 另外提供「后端式导出」，直接下载服务端生成的 xlsx

### 🔄 离线优先（核心机制）

- 账单与待同步队列都存在 **IndexedDB**（localforage），并且**按用户名分桶**，多账号互不干扰
- 所有写操作都是**乐观更新**：先改本地并落盘，再尝试发往服务端
- 失败或离线时写入 `pendingActions` 队列，网络恢复后由 `useSyncEngine` 逐条补推
- 补推失败的动作**会保留在队列中重试**，不会静默丢弃；本轮结束后提示失败条数
- 20 秒一次心跳探测 `/api/health`（连续 2 次无响应才判定离线）

### 🧩 更多细节

- 登录成功后立即同步账单与分类
- 响应式布局（部分页面待优化）
- Element Plus 深度定制，毛玻璃卡片风格

***

## 🛠️ 技术栈

| 类别 | 技术 | 版本 |
| --- | --- | --- |
| 前端框架 | Vue 3（Composition API + `<script setup>`） | 3.5.32 |
| 语言 | TypeScript | 6.0.3 |
| 构建工具 | Vite | 8.0.9 |
| 状态管理 | Pinia + pinia-plugin-persistedstate | 3.0.4 |
| 路由 | Vue Router | 5.0.4 |
| UI 库 | Element Plus | 2.13.7 |
| 图表 | ECharts | 6.0.0 |
| 本地存储 | localforage（IndexedDB） | 1.10.0 |
| 工具库 | dayjs, nanoid, @vueuse/core, axios(+axios-retry), xlsx, marked, highlight.js | — |
| 后端 | Spring Boot（**不在本仓库**，接口见下） | — |

***

## 📦 快速开始

### 前提条件

- **Node.js** `^20.19.0 || >=22.12.0`（见 `package.json` 的 `engines`）
- **包管理器**：npm / pnpm / yarn 均可
- **浏览器**：Chrome 90+、Edge 90+、Firefox 88+ 或 Safari 14+

### 安装与运行

```bash
git clone <你的仓库地址>
cd money-note

npm install        # 或 pnpm install

npm run dev        # 启动开发服务器（默认 5173）
npm run build      # 类型检查 + 构建生产包
npm run preview    # 预览构建产物
npm run type-check # 只跑 vue-tsc 类型检查
```

> 项目当前**没有配置 ESLint / Prettier**，只有 `type-check` 这一道静态防线。

### 环境变量

在项目根目录创建 `.env.local`（或 `.env.development` / `.env.production`）：

```env
# 后端 API 地址。留空则使用 /api 相对路径，配合 vite.config.ts 的 proxy
VITE_BASE_URL=/api
```

若不配置 `VITE_BASE_URL`，`axios` 的 `baseURL` 会回退为 `/api`，由 Vite dev server 代理到 `baseUrl.ts` 里配置的目标地址。

> ⚠️ **注意**：仓库根目录下的 `baseUrl.ts` 硬编码了一个内网穿透域名，且**未被 `.gitignore` 正确忽略**（`.gitignore` 中那行用了 `//` 注释，Git 只认 `#`，所以忽略规则没生效）。如果你要公开这个仓库，请先把它改成环境变量方式，并清理 Git 历史中的记录。

***

## 📁 项目结构

```
src/
├── api/            # 接口封装
│   ├── request.ts  #   axios 实例、拦截器、重试、401 处理
│   ├── auth.ts     #   登录 / 注册
│   ├── record.ts   #   账单 CRUD、导入、导出
│   └── categories.ts
├── composables/    # 组合式函数
│   ├── useServerStatus.ts   # 后端心跳探测
│   ├── useSyncEngine.ts     # 离线队列补推 + 自动重登
│   └── useErrorHandler.ts   # 统一错误提示
├── stores/         # Pinia
│   ├── user.ts        # 登录态（persist: token, currentUser）
│   ├── records.ts     # 账单 + 离线队列 + 分页（按用户分桶存 IndexedDB）
│   └── categories.ts  # 分类
├── views/
│   ├── Login.vue      # 登录
│   ├── Register.vue   # 注册
│   ├── Dashboard.vue  # 首页
│   ├── Accounting.vue # 记账页（只有表单）
│   ├── Records.vue    # 明细页（只有列表）
│   ├── ReportsPage.vue# 报表页
│   └── Settings.vue   # 账号 / 分类 / 导入 / 导出
├── components/
│   ├── MainLayout.vue      # 侧边栏 + 顶栏 + 服务器状态指示
│   ├── AuthLayout.vue      # 登录注册通用外壳
│   ├── RecordForm.vue      # 记账表单
│   ├── RecordList.vue      # 账单列表（分页、月份跳转、编辑删除）
│   ├── RecordEditDialog.vue# 备注编辑（Markdown）容器
│   ├── MarkdownEditor.vue  # Markdown 编辑 + 预览
│   └── StatsCard.vue       # 收支统计卡片
├── utils/
│   ├── wechatBillParser.ts # 微信账单解析（编码自适应）
│   ├── export.ts           # Excel / JSON / CSV 导出
│   ├── markdown.ts         # Markdown → 纯文本摘要
│   └── icons.ts            # 分类图标白名单
├── router/index.ts
├── App.vue
└── main.ts
```

### 路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/login` | Login | 未登录可访问 |
| `/register` | Register | 未登录可访问 |
| `/dashboard` | Dashboard | 需登录 |
| `/accounting` | Accounting | 需登录，**只记账** |
| `/records` | Records | 需登录，**只看明细** |
| `/reports` | ReportsPage | 需登录 |
| `/settings` | Settings | 需登录 |

***

## 🔌 后端 API 说明

所有请求遵循统一响应格式：

```json
{ "code": 10000, "message": "成功", "data": { } }
```

成功码固定为 **10000**。鉴权通过请求头 `Authorization: Bearer <token>`。

### 前端当前实际调用的端点

`axios` 的 `baseURL` 为 `VITE_BASE_URL`（默认 `/api`），下表路径已含该前缀：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/login` | 登录 |
| POST | `/api/register` | 注册 |
| GET | `/api/health` | 心跳探测（20s 一次） |
| GET | `/api/records` | 列表，支持 `page` / `limit` / `startDate` / `endDate` |
| POST | `/api/records` | 新增 |
| PUT | `/api/records/{id}` | 更新 |
| DELETE | `/api/records/{id}` | 删除 |
| POST | `/api/records/import` | 批量导入，body `{ records: [...] }` |
| GET | `/api/records/export/xlsx` | 服务端导出（blob） |
| GET | `/api/categories` | 分类列表 |
| POST | `/api/categories` | 新增分类 |
| PUT | `/api/categories/{id}` | 更新分类 |
| DELETE | `/api/categories/{id}` | 删除分类 |

> ⚠️ **待确认**：旧版文档里登录注册写的是 `/api/auth/login`、`/api/auth/register`，而前端代码调用的是 `/api/login`、`/api/register`。**这两组存在分歧**，需要以你实际部署的后端为准，并同步修改前端 `src/api/auth.ts` 或本文档。后端源码不在本仓库，无法在这里定论。

### 关键字段约定

| 字段 | 约定 |
| --- | --- |
| 日期 | 字符串 `"YYYY-MM-DD HH:mm:ss"` |
| 收支类型 | `"income"` / `"expense"` |
| 分类 | 传**分类名称字符串**，不是 id |
| 金额 | 数字，2 位小数 |
| 登录返回 | `data.token` + `data.user`（对象，含 `username`） |
| 导入返回 | `data` 含 `successCount` / `failCount` |

### 分页

前端已按服务端分页实现：请求带 `page` / `limit`，并**同时兼容两种响应形态**：

- `{ list, total, page, limit }` —— 视为支持分页，继续无限滚动
- 直接返回数组 —— 视为一次给全量，不再加载更多

如果希望真正启用分页，后端返回对象形态即可，**前端无需改动**。

***

## 🧪 演示账号

登录页有一键填充按钮：

- 用户名：`demo_001`
- 密码：`123456`

> 后端不可用时会自动切换到本地模式。本地模式下**任何注册的用户名都能登录**（账号密码明文存在浏览器 `localStorage`，仅供离线体验，请不要使用真实密码）。

***

## ⚠️ 已知问题与待办

- **接口路径分歧**：登录注册端点是 `/api/*` 还是 `/api/auth/*`，需与后端确认后统一
- **自动重登仅在当前页面会话有效**：离线登录凭证未持久化，刷新页面后需要手动重新登录才能同步积压数据
- **日期区间边界**：前端导出传的是纯日期（如 `2026-09-30`），若后端按字符串比较 `BETWEEN`，区间最后一天的记录会被漏掉
- **后端地址硬编码**：`baseUrl.ts` 写死了内网穿透域名，且未被 `.gitignore` 正确忽略
- **无 lint**：项目缺少 ESLint / Prettier 配置
- **无测试**：离线同步链路尚未覆盖自动化测试
- **未打包体积**：echarts 与 marked 较大，构建产物存在 >500kB 的 chunk 告警

后续计划用 Python（FastAPI）重写后端并接入 AI 能力，届时会一并冻结接口契约。

***

## 🚀 Roadmap

- [x] Excel / JSON / CSV 数据导出
- [x] 离线记录缓存与自动同步
- [x] 服务端分页加载
- [x] 记账页与明细页分离
- [x] Markdown 备注与纯文本摘要
- [ ] **AI 智能记账**：接入 LLM，自然语言输入自动生成记录
- [ ] **智能分类建议**：替代当前硬编码的微信账单分类规则
- [ ] **消费趋势分析**：基于历史数据生成中文洞察
- [ ] 预算预警与异常消费检测
- [ ] 深色模式
- [ ] 移动端适配优化

***

**欢迎 Star ⭐ 和 PR！**
