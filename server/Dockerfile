# ============================================================
# ZMYL 一体化镜像：前端构建 + 后端 API 同容器（单端口 8888）
# 注意：构建上下文必须是仓库根目录（docker-compose 已配好）
#   docker build -f server/Dockerfile -t zmyl-app .
# ============================================================

# 阶段1：构建前端
FROM node:20-alpine AS web-builder
WORKDIR /web
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 阶段2：后端运行时（含前端 dist 托管）
FROM node:20-alpine
RUN apk add --no-cache python3 make g++ \
    && ln -sf python3 /usr/bin/python
WORKDIR /app

# 装后端依赖（better-sqlite3 需 python3/make/g++ 原生编译）
COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server/ ./
COPY --from=web-builder /web/dist /app/frontend-dist
RUN mkdir -p data logs uploads

ENV NODE_ENV=production
ENV PORT=8888
ENV FRONTEND_DIST=/app/frontend-dist
ENV DB_PATH=/app/data/zmyl.db

EXPOSE 8888
VOLUME ["/app/data", "/app/logs", "/app/uploads"]

# 启动：先迁移（幂等）再启动服务（API + 前端同端口）
CMD ["sh", "-c", "node src/db/migrate.js up && node src/db/migrate.js seed && node src/server.js"]
