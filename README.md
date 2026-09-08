# 卓盟医疗器械全生命周期管理平台 v3.0

> **Node.js Express + Vue3 前后端分离架构**（2026-09 重构）

| 维度 | 技术栈 |
|------|--------|
| **后端** | Node.js 20 + Express + better-sqlite3 + JWT |
| **前端** | Vue3 + Vite + Element Plus + Pinia + vue-router |
| **数据库** | SQLite（better-sqlite3，业务代码走 async 门面，可低成本切 MySQL） |
| **部署** | Docker Compose 一体化容器（Express 托管前端 dist，单端口 8888） |
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
├── start.sh                  # 一键启动（装依赖 → 构建前端 → 迁移 → 启动 :8888）
├── package.json              # 根入口（npm start = 一键启动）
├── docker-compose.yml        # 一体化容器编排
└── README.md
```

## 一键启动（推荐，服务器部署）

```bash
./start.sh        # 或：npm start
# 自动完成：装依赖(如缺) → 构建前端 → 数据库迁移 → 启动
# 访问 http://服务器IP:8888（前端 + API 同端口，单进程）
```

常用变体：

| 命令 | 说明 |
|---|---|
| `./start.sh` / `npm start` | 生产模式一键启动（:8888） |
| `./start.sh --rebuild` / `npm run rebuild` | 前端代码更新后强制重新构建 |
| `./start.sh --dev` / `npm run start:dev` | 开发模式：API :8888 + Vite :5175 热重载 |
| `PORT=9000 ./start.sh` | 自定义端口 |

Docker 一键部署（同样是单容器单端口 8888）：

```bash
cp server/.env.example server/.env    # 修改 JWT_SECRET
docker compose up -d --build          # 访问 http://服务器IP:8888
```

## 本地开发（分进程调试）

### 1. 启动后端（端口 8888）

```bash
cd server
cp .env.example .env       # 首次：编辑 JWT_SECRET
npm install                 # 装依赖（better-sqlite3 需 python3+make+g++）
npm run dev                 # nodemon 热重载
```

> 数据库首次启动会自动建表 + 种子数据（admin / 123456）
> 后端同时会托管 `frontend/dist`（如果已构建），即 :8888 也能直接访问页面

### 2. 启动前端（端口 5175）

```bash
cd frontend
npm install
npm run dev                 # Vite 代理 /api → :8888
```

打开 http://localhost:5175 即可登录（热重载开发用）。

### 3. 默认账号

- **admin / 123456**（系统管理员，已在 seed 阶段创建）

## 生产部署（Docker Compose）

```bash
cp server/.env.example server/.env    # 修改 JWT_SECRET
docker compose up -d --build          # 一体化容器（前端 + API）
# 访问 http://服务器IP:8888
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
- 一键启动（start.sh + 一体化 Docker 容器，单端口 8888）
- 前端 vue-router + Pinia 接入
- dashboard 路径修复（前端 /stats → 后端 无后缀）
- logout 后端路由补齐
- DB async 门面（业务代码统一 `await db.get/all/run`，切换 MySQL 只改 `db/index.js` 一个文件）

## 数据库切换说明（SQLite → MySQL）

业务代码（controllers / middleware / utils）从第一天起就只调用 **async 门面**（`db.get / db.all / db.run / db.exec / db.transaction`），不直接触碰 better-sqlite3。将来切 MySQL 时：

| 步骤 | 工作量 |
|---|---|
| 重写 `server/src/db/index.js`（better-sqlite3 → mysql2/promise 连接池，保持同名 API） | 半天 |
| `migrations/*.js` DDL 按方言重写（AUTOINCREMENT → AUTO_INCREMENT 等） | 半天 |
| 存量数据 ETL（sqlite3-to-mysql / 手写脚本） | ~1 天 |
| **controllers / middleware / utils 改动** | **0 行** |

约定：迁移基建（`migrate.js` / `migrations/` / `ensureSchema.js`）使用 `db.raw` 原始句柄（同步），业务代码禁止使用 `raw`。

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
| 部署 | 单镜像 8000 | 一体化容器（前端 + API 同端口 8888） |
| 端口 | 8000 | 8888（dev 前端 5175） |

## 回退到 Python 后端（如 P1 验证后发现问题）

```bash
docker compose down          # 停掉容器
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