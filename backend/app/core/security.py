# -*- coding: utf-8 -*-
"""JWT 认证：签发/校验/依赖注入"""
import bcrypt
import jwt as pyjwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from .config import JWT_SECRET, JWT_EXPIRE_MINUTES
from .db import get_db
from .resp import BizError

_TOKEN_MIN_LEFT = 60  # 剩余不足60秒也刷新


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    # 兼容原Flask scrypt格式：scrypt:...$salt$hash —— 无法跨库校验，仅bcrypt直验
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_token(user) -> str:
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "name": user.name,
        "role": user.role_code,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except pyjwt.ExpiredSignatureError:
        raise BizError(401, "登录已过期，请重新登录", status=401)
    except pyjwt.InvalidTokenError:
        raise BizError(401, "无效的登录凭证", status=401)


def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise BizError(401, "未登录或缺少凭证", status=401)
    payload = decode_token(auth[7:])
    from ..models.system import User
    user = db.query(User).filter(User.id == int(payload["sub"]), User.deleted == 0).first()
    if not user or user.status != "active":
        raise BizError(401, "用户不存在或已停用", status=401)
    request.state.user = user
    return user


def require_role(*codes):
    """角色白名单依赖"""
    def dep(user=Depends(get_current_user)):
        if user.role_code not in codes:
            raise BizError(403, "无权限执行此操作", status=403)
        return user
    return dep
