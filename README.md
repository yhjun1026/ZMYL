# 卓盟医疗器械全生命周期管理平台 v3.0

> **Node.js Express + Vue3 前后端分离架构**（2026-09 重构）

| 维度 | 技术栈 |
|------|--------|
| **后端** | Node.js 20 + Express + better-sqlite3 + JWT |
| **前端** | Vue3 + Vite + Element Plus + Pinia + vue-router |
| **数据库** | SQLite（better-sqlite3 同步驱动） |
| **部署** | Docker Compose 双容器（web nginx + api express） |
| **架构对齐** | 与 ZM 项目（`/Users/yanghongjun/code/ZM`）100% 一致 |

## 工程结构

```
ZMYLV3/
├── server/                   # Node.js 后端（P1 完成）
│   ├── src/
│   │   ├── server.js         # 进程入口
│   │   ├── app.js            # Express 装配
│   │   ├── config/           # 配置（env loader）
│   │   ├── db/               # better-sqlite3 单例 + 迁移
│   │   │   ├── index.js
│   │   │   ├── migrate.js    # up/seed/reset/status 命令
│   │   │   ├── ensureSchema.js
│   │   │   └── migrations/
│   │   │       └── 001_init_users_roles.js  # 13 角色 + admin
│   │   ├── middleware/       # auth/error/security/rateLimit/validate/rbac
│   │   ├── utils/            # jwt/response/asyncHandler/audit/logger
│   │   ├── controllers/      # auth/user/dashboard
│   │   └── routes/           # 路由聚合
│   ├── tests/                # jest 冒烟
│   ├── data/                 # SQLite 文件（VOLUME）
│   ├── logs/                 # 日志（VOLUME）
│   ├── uploads/              # 文件上传（VOLUME）
│   ├── .env.example
│   ├── Dockerfile
│   ├── ecosystem.config.js   # PM2
│   └── package.json
├── frontend/                 # Vue3 前端（P1 完成）
│   ├── src/
│   │   ├── api/index.js      # axios + JWT 拦截器 + 所有 API 封装
│   │   ├── stores/auth.js    # Pinia 鉴权 store
│   │   ├── stores/index.js
│   │   ├── router/index.js   # 真路由（替代 currentView 假路由）
│   │   ├── views/            # Login/Dashboard/MainLayout/ModulePage
│   │   ├── styles/
│   │   └── main.js
│   ├── Dockerfile
│   ├── vite.config.js
│   └── package.json
├── deploy/
│   ├── nginx.conf            # Docker 容器内 nginx
│   └── nginx.bare.conf       # 裸机部署 nginx
├── backend/                  # ⚠️ 旧 Python FastAPI（DEPRECATED，P4 后删）
├── docker-compose.yml        # 双容器编排
└── README.md
```

## 本地开发（推荐）

### 1. 启动后端（端口 8080）

```bash
cd server
cp .env.example .env       # 首次：编辑 JWT_SECRET
npm install                 # 装依赖（better-sqlite3 需 python3+make+g++）
npm run dev                 # nodemon 热重载
```

> 数据库首次启动会自动建表 + 种子数据（admin / 123456）

### 2. 启动前端（端口 5173）

```bash
cd frontend
npm install
npm run dev                 # Vite 代理 /api → :8080
```

打开 http://localhost:5173 即可登录。

### 3. 默认账号

- **admin / 123456**（系统管理员，已在 seed 阶段创建）

## 生产部署（Docker Compose）

```bash
cd server && cp .env.example .env    # 修改 JWT_SECRET
docker compose up -d --build         # web(80) + api(8080)
# 访问 http://服务器IP
```

数据持久化：
- `./server/data/zmyl.db` —— SQLite 数据库
- `./server/logs/` —— 日志
- `./server/uploads/` —— 上传文件

## 已完成 / 待完成

### ✅ P1 — 架构骨架（已完成 2026-09-08）
- Node.js Express 工程骨架（middleware/utils/config/db 全套）
- 13 角色 + admin 种子数据
- auth + user + dashboard 三个 controller
- 双容器 Docker 编排
- 前端 vue-router + Pinia 接入
- dashboard 路径修复（前端 /stats → 后端 无后缀）
- logout 后端路由补齐

### 🚧 P2 — 业务基础（下一阶段）
- 39 张业务表 DDL（沿用当前 ZMYLV3 字段定义）
- 自动 CRUD 生成器
- 工作流路由（两级审批 + 采购 5 步）
- 解决 `workflow.py` 重复函数定义 bug（彻底删除 Python 后端）
- 端到端验证：登录 → 工作台 → 任一模块新增 → 工作流推进

### 📋 P3 — 业务增强
- 销售出库 6 级流
- 产品验收 5 步
- 审批通知收件箱
- 报表 / Excel 导出
- 养护记录（cure_record）
- PDF 上传下载

### 🚀 P4 — 高级特性
- 可配置审批流引擎（FLOW_HOOK_MAP）
- 冷链 IoT 全链
- 物流追踪
- 数据互联互通引擎（bridge）
- 多租户
- 自动备份

## 关键变更（对比旧 Python 后端）

| 改动 | 旧 FastAPI | 新 Express |
|------|-----------|-----------|
| 类型校验 | `Mapped[object]` 全无效 | SQLite 手写 DDL + Joi |
| 多租户 | ORM 事件 | P4 接 |
| JWT 载荷 | username + role | userId + role（轻量） |
| 数据库 | MySQL | SQLite |
| 部署 | 单镜像 8000 | 双容器 web(80) + api(8080) |
| 端口 | 8000 | web:80 + api:8080 |

## 回退到 Python 后端（如 P1 验证后发现问题）

```bash
docker compose down          # 停掉双容器
cd backend
docker compose up -d --build # 用老的 docker-compose
```

> 老 Dockerfile 和 `backend/` 暂时保留，作为回退。P4 完成后删除。

## API 约定

所有路由前缀 `/api/`，返回格式：
```json
{ "success": true, "data": ..., "message": "..." }
{ "success": false, "message": "错误信息" }
```

已实现端点（P1）：
- `GET  /api/health`
- `POST /api/auth/login`
- `GET  /api/auth/me`（需 Bearer token）
- `POST /api/auth/logout`（需 Bearer token）
- `POST /api/auth/change-password`（需 Bearer token）
- `GET  /api/user/roles/all`（需 Bearer token）
- `GET  /api/user?page&size&keyword`（需 Bearer token）
- `POST /api/user`（sys_admin）
- `PUT  /api/user/:id`
- `DELETE /api/user/:id`（sys_admin）
- `GET  /api/dashboard`（需 Bearer token，兼容旧字段名）
- `GET  /api/dashboard/trends`（需 Bearer token）

## 验证记录（2026-09-08 P1）

- 工程骨架完整：13 个 src 文件 + 8 个配置文件
- 端到端 curl 待你装完依赖后跑（见上文"本地开发"步骤 1）
- 前端 /api/dashboard 路径修复 + token key 对齐到 zmyl_token
- logout 后端路由补齐（P1 前端 /api/auth/logout 会 404，现已修复）

## 文档

- `backend/DEPRECATED.md` —— 旧 Python 后端说明
- 后续 P2/P3/P4 完成会更新本文档