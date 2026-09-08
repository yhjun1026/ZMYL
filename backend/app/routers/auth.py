# -*- coding: utf-8 -*-
"""认证与用户管理"""
from datetime import datetime
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import create_token, get_current_user, hash_password, verify_password
from ..core.resp import ok, BizError
from ..models.system import User, Role
from .crud import serialize, yield_body

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    body = await yield_body(request)
    username, password = body.get("username", ""), body.get("password", "")
    user = db.query(User).filter(User.username == username, User.deleted == 0).first()
    if not user or not verify_password(password, user.password_hash or ""):
        raise BizError(401, "用户名或密码错误", status=401)
    if user.status != "active":
        raise BizError(401, "账号已停用，请联系管理员", status=401)
    role = db.query(Role).filter(Role.code == user.role_code).first()
    return ok({
        "accessToken": create_token(user),
        "user": serialize(user),
        "roleName": role.name if role else user.role_code,
    })


@router.get("/me")
def me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.code == user.role_code).first()
    data = serialize(user)
    data.pop("password_hash", None)
    data["roleName"] = role.name if role else user.role_code
    return ok(data)


@router.post("/change_password")
async def change_password(request: Request, user=Depends(get_current_user),
                          db: Session = Depends(get_db)):
    body = await yield_body(request)
    old, new = body.get("oldPassword", ""), body.get("newPassword", "")
    if not verify_password(old, user.password_hash or ""):
        raise BizError(400, "原密码错误")
    if len(new) < 6:
        raise BizError(400, "新密码长度不能少于6位")
    user.password_hash = hash_password(new)
    user.updated_by = user.username
    db.commit()
    return ok(None, "密码修改成功")
