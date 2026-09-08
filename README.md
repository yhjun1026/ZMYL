# 卓盟医疗器械全生命周期管理平台 v3.0

前后端一体部署的生产级架构：**Vue3 标准前端工程 + Python FastAPI 后端，单镜像单端口**。

## 工作流（审批体系）

| 流程 | 状态流转 | 模块 |
|---|---|---|
| 两级审批 | 待审核 -> 已审核 -> 已批准/已驳回 | 供应商/客户/人员/健康档案/培训/首营厂/首营品种/企业资质/资质更新 |
| 采购计划审批 | 待审批 -> 已批准/已驳回 -> 转采购执行单 | 采购计划 |
| 采购五步流 | 待验收 -> 待质管审核 -> 待库管确认 -> 待负责人批准 -> 已入库 | 采购设备/采购耗材 |

- GSP留档保护：已批准的档案类记录不可删除（保存至失效后2年）
- 操作日志：所有审批动作写入 operation_log

## 架构

```
med-stack/
├── backend/                  # Python 后端（FastAPI 分层工程）
│   ├── app/
│   │   ├── core/             # 配置/数据库/JWT认证/统一响应
│   │   ├── models/           # 42张表 SQLAlchemy 模型（自动生成）
│   │   └── routers/          # auth/user/dashboard + 41模块通用CRUD + workflow审批流
│   ├── requirements.txt
│   └── .env.example          # 生产配置模板
├── frontend/                 # Vue3 + Vite + Element Plus 标准工程
│   └── src/
│       ├── api/              # axios封装 + CRUD通用接口
│       ├── router/           # 路由 + 菜单（39模块分组）
│       ├── styles/           # 全局样式（主色#409EFF 圆角卡片风）
│       └── views/            # 登录/布局/工作台/通用模块页/用户管理
├── Dockerfile                # 多阶段构建：node打包前端 → python运行时单镜像
├── docker-compose.yml        # app + mysql 一键部署
└── db/migration/             # 建表DDL + 存量数据迁移SQL（沿用v2.0）
```

## 一体部署原理

Vue 构建产物（frontend/dist）由 FastAPI 直接托管：
- `/api/*` → 后端接口
- `/assets/*` → 静态资源
- 其余任意路径 → 回退 index.html（SPA路由）

**一个进程、一个端口（8000），无需 nginx**。生产用 gunicorn 4 worker。

## 本地开发

```bash
# 后端（WSL内）
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 前端（热更新，代理到8000）
cd frontend
npm install && npm run dev    # http://localhost:5175
```

## 生产部署

```bash
cp backend/.env.example .env   # 修改全部密码
docker compose up -d --build   # 构建单镜像 + MySQL
# 访问 http://服务器IP:8000
```

## 验证记录（2026-08-19）

- 后端 API：39/39 模块 CRUD 全部 PASS（smoke.sh）
- Dashboard：设备19台 / 库存41件 / 出库23单 / 不良事件2起 / 临期预警1条
- UI E2E（Playwright 真实浏览器）：登录→工作台→台账列表→新增弹窗→库存页→退出登录，7/8 PASS（1条为断言笔误，功能正常）、无JS错误
- 一体模式：8000端口同时出 API 与页面，SPA 路由回退正常

## 账号

admin / admin123（系统管理员，13个角色体系沿用原库）
