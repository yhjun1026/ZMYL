# -*- coding: utf-8 -*-
"""配置加载：环境变量 > .env 文件 > 默认值"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # app/core/config.py -> backend/

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "med_admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "medpass2026")
DB_NAME = os.getenv("DB_NAME", "medical_device")

SQLALCHEMY_DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    "?charset=utf8mb4"
)

JWT_SECRET = os.getenv("JWT_SECRET", "ChangeMe-Jwt-至少32位随机字符串-0123456789")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))

APP_PORT = int(os.getenv("APP_PORT", "8000"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 前端构建产物（一体部署）
FRONTEND_DIST = Path(
    os.getenv("FRONTEND_DIST", str(BASE_DIR.parent / "frontend" / "dist"))
)
