# 卓盟医疗器械管理平台 v3.0 —— 前后端一体镜像
# 构建阶段1：前端 Vue3 + Vite
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 构建阶段2：后端依赖
FROM python:3.12-slim AS deps
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 运行阶段：单镜像单进程
FROM python:3.12-slim
WORKDIR /app
ENV TZ=Asia/Shanghai PYTHONUNBUFFERED=1
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY backend/app ./app
COPY --from=web /web/dist ./frontend/dist

RUN mkdir -p uploads && \
    apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && \
    useradd -m meduser && chown -R meduser:meduser /app
USER meduser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -sf http://localhost:8000/api/health || exit 1

# 生产：多worker（gunicorn+uvicorn）
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", \
     "-b", "0.0.0.0:8000", "-w", "4", "--timeout", "120"]
