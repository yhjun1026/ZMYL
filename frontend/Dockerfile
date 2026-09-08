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