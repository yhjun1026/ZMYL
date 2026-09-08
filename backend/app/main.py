# -*- coding: utf-8 -*-
"""应用入口：API + 前端静态托管（一体部署）"""
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from .core.config import FRONTEND_DIST, APP_PORT
from .core.resp import BizError
from .routers import auth_router, user_router, dashboard_router, crud_routers, workflow_router
from .models import system  # noqa 确保模型注册

app = FastAPI(title="卓盟医疗器械全生命周期管理平台", version="3.0.0")

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(dashboard_router)
for r in crud_routers:
    app.include_router(r)
app.include_router(workflow_router)


@app.exception_handler(BizError)
async def biz_error_handler(request: Request, exc: BizError):
    return JSONResponse(status_code=exc.status_code,
                        content={"code": exc.biz_code, "msg": exc.biz_msg, "data": None})


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"code": 500, "msg": f"服务器内部错误: {exc}", "data": None})


@app.get("/api/health")
def health():
    return {"code": 0, "msg": "ok", "data": {"status": "UP"}}


# ===== 前端静态托管（一体部署核心）=====
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        # API 未命中的路径全部回退到 SPA
        f = FRONTEND_DIST / full_path
        if full_path and f.is_file():
            return FileResponse(f)
        return FileResponse(FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=APP_PORT, reload=False)
