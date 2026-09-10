#!/usr/bin/env bash
# ============================================================
# ZMYL 卓盟医疗器械全生命周期管理平台 —— 一键启动脚本
#
# 用法：
#   ./start.sh              生产模式：装依赖(如缺) → 构建前端 → 迁移 → 启动 :8888
#   ./start.sh --rebuild    强制重新构建前端（前端代码更新后用）
#   ./start.sh --dev        开发模式：API :8888 + Vite :5175（前后端热重载，Ctrl+C 一起退出）
#   ./start.sh --build-only 只构建前端，不启动服务
#   PORT=9000 ./start.sh    自定义端口
#   BASE_PATH=/yl/ ./start.sh --rebuild   子路径部署构建（配合 nginx location /yl/ 转发）
#
# 访问入口：http://localhost:8888（前端 + API 同端口，单进程）
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8888}"
export PORT

DEV=0; REBUILD=0; BUILD_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --dev)        DEV=1 ;;
    --rebuild)    REBUILD=1 ;;
    --build-only) BUILD_ONLY=1 ;;
    *) echo "未知参数: $arg（支持 --dev / --rebuild / --build-only）"; exit 1 ;;
  esac
done

# ---- 0. 环境检查 ----
command -v node >/dev/null 2>&1 || { echo "✗ 未找到 node，请先安装 Node.js >= 18"; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ 需要 Node.js >= 18（当前 $(node -v)）"
  exit 1
fi

if [ ! -f "$ROOT/server/.env" ]; then
  cp "$ROOT/server/.env.example" "$ROOT/server/.env"
  echo "→ 已生成 server/.env（生产环境请务必修改 JWT_SECRET）"
fi

# ---- 1. 依赖安装（node_modules 缺失才装，幂等）----
if [ ! -d "$ROOT/server/node_modules" ]; then
  echo "→ 安装后端依赖（better-sqlite3 需 python3+make+g++ 原生编译）..."
  (cd "$ROOT/server" && npm install --no-audit --no-fund)
fi
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "→ 安装前端依赖..."
  (cd "$ROOT/frontend" && npm install --no-audit --no-fund)
fi

# ---- 2. 开发模式：前后端 dev server 同跑 ----
if [ "$DEV" = "1" ]; then
  echo "→ 开发模式：API :$PORT + Vite :5175（Vite 代理 /api）"
  (cd "$ROOT/server" && npm run dev) &
  API_PID=$!
  (cd "$ROOT/frontend" && npm run dev) &
  WEB_PID=$!
  trap 'kill $API_PID $WEB_PID 2>/dev/null || true; exit 0' EXIT INT TERM
  wait
  exit 0
fi

# ---- 3. 构建前端（dist 缺失、--rebuild、或源码比 dist 新时）----
NEED_BUILD=0
if [ ! -f "$ROOT/frontend/dist/index.html" ] || [ "$REBUILD" = "1" ]; then
  NEED_BUILD=1
elif [ -n "$(find "$ROOT/frontend/src" "$ROOT/frontend/index.html" "$ROOT/frontend/vite.config.js" -newer "$ROOT/frontend/dist/index.html" -print -quit 2>/dev/null)" ]; then
  NEED_BUILD=1
  echo "→ 检测到前端源码比 dist 新，自动重新构建..."
fi
if [ "$NEED_BUILD" = "1" ]; then
  echo "→ 构建前端..."
  (cd "$ROOT/frontend" && npm run build)
fi

if [ "$BUILD_ONLY" = "1" ]; then
  echo "✓ 前端构建完成：$ROOT/frontend/dist"
  exit 0
fi

# ---- 4. 数据库迁移（幂等）----
echo "→ 数据库迁移..."
(cd "$ROOT/server" && node src/db/migrate.js up && node src/db/migrate.js seed)

# ---- 5. 启动（单进程：Express 托管 API + 前端 dist）----
echo "→ 启动服务：http://localhost:$PORT（前端 + API 同端口）"
cd "$ROOT/server"
export NODE_ENV=production
exec node src/server.js
