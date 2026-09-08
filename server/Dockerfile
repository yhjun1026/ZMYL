# 阶段1：构建前端
FROM node:20-alpine AS web-builder
WORKDIR /web
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 阶段2：构建后端
FROM node:20-alpine
RUN apk add --no-cache python3 make g++ \
    && ln -sf python3 /usr/bin/python
WORKDIR /app

# 装后端依赖（better-sqlite3 需要 python3/make/g++ 原生编译）
COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server/ ./
RUN mkdir -p data logs uploads

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/zmyl.db

EXPOSE 8080
VOLUME ["/app/data", "/app/logs", "/app/uploads"]

# 启动：先迁移（幂等）再启动服务
CMD ["sh", "-c", "node src/db/migrate.js up && node src/db/migrate.js seed && node src/server.js"]