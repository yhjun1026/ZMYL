# -*- coding: utf-8 -*-
"""用户管理（管理员）"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user, require_role, hash_password
from ..core.resp import ok, BizError
from ..models.system import User, Role
from .crud import serialize, yield_body

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("")
def list_users(page: int = 1, size: int = 10, keyword: str = "",
               user=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(User).filter(User.deleted == 0)
    if keyword:
        from sqlalchemy import or_
        q = q.filter(or_(User.username.like(f"%{keyword}%"), User.name.like(f"%{keyword}%")))
    total = q.count()
    rows = q.order_by(User.id).offset((page - 1) * size).limit(size).all()
    records = []
    for u in rows:
        d = serialize(u); d.pop("password_hash", None)
        records.append(d)
    return ok({"total": total, "records": records})


@router.post("")
async def create_user(request: Request, user=Depends(require_role("sys_admin")),
                      db: Session = Depends(get_db)):
    body = await yield_body(request)
    if db.query(User).filter(User.username == body.get("username"), User.deleted == 0).first():
        raise BizError(400, "用户名已存在")
    u = User(
        username=body.get("username"), name=body.get("name"),
        dept=body.get("dept"), role_code=body.get("role_code"),
        phone=body.get("phone"), email=body.get("email"),
        status=body.get("status", "active"),
        password_hash=hash_password(body.get("password") or "123456"),
        created_by=user.username, created_at=__import__("datetime").datetime.now(),
    )
    db.add(u); db.commit(); db.refresh(u)
    d = serialize(u); d.pop("password_hash", None)
    return ok(d, "新增成功")


@router.put("/{uid}")
async def update_user(uid: int, request: Request, user=Depends(get_current_user),
                      db: Session = Depends(get_db)):
    if user.role_code != "sys_admin" and user.id != uid:
        raise BizError(403, "只能修改自己的信息", status=403)
    body = await yield_body(request)
    u = db.query(User).filter(User.id == uid, User.deleted == 0).first()
    if not u:
        raise BizError(404, "用户不存在", status=404)
    for k in ("name", "dept", "role_code", "phone", "email", "status"):
        if k in body:
            setattr(u, k, body[k])
    if body.get("password"):
        u.password_hash = hash_password(body["password"])
    u.updated_by = user.username
    db.commit(); db.refresh(u)
    d = serialize(u); d.pop("password_hash", None)
    return ok(d, "更新成功")


@router.delete("/{uid}")
def delete_user(uid: int, user=Depends(require_role("sys_admin")),
                db: Session = Depends(get_db)):
    if uid == user.id:
        raise BizError(400, "不能删除当前登录用户")
    u = db.query(User).filter(User.id == uid, User.deleted == 0).first()
    if not u:
        raise BizError(404, "用户不存在", status=404)
    u.deleted = 1; u.updated_by = user.username
    db.commit()
    return ok(None, "删除成功")


@router.get("/roles/all")
def all_roles(user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Role).filter(Role.deleted == 0).all()
    return ok([serialize(r) for r in rows])
