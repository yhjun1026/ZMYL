# ============================================================
# 备选方案：前端独立容器（nginx 托管 + /api 反代到 api 容器 8888）
# 注意：构建上下文必须是仓库根目录
#   docker build -f frontend/Dockerfile -t zmyl-web .
# 默认部署用 docker-compose.yml 的一体化容器，无需本文件
# ============================================================

# 阶段1：构建前端
FROM node:20-alpine AS builder
WORKDIR /web
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 阶段2：nginx 托管
FROM nginx:1.27-alpine
COPY --from=builder /web/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]