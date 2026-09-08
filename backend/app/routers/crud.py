# -*- coding: utf-8 -*-
"""通用CRUD服务：分页查询/新增/更新/逻辑删除，覆盖全部业务表"""
from datetime import datetime
from typing import Any, Type
from fastapi import Depends, Request
from pydantic import BaseModel, create_model
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user
from ..core.resp import ok, BizError
from ..models import all_tables
from ..models.system import User


def find_model(table: str):
    """表名 -> 模型类（蛇形转驼峰）"""
    cname = ''.join(w.capitalize() for w in table.split('_'))
    m = getattr(all_tables, cname, None)
    if m is None:
        raise BizError(404, f"未知的资源: {table}", status=404)
    return m


def clean_payload(model, body: dict, drop=("id", "created_at", "updated_at")) -> dict:
    cols = {c.name for c in model.__table__.columns}
    return {k: v for k, v in body.items() if k in cols and k not in drop}


def make_router(table: str, search_fields: tuple = ()):
    """为一个表生成标准 CRUD 路由"""
    from fastapi import APIRouter
    model = find_model(table)
    router = APIRouter(prefix=f"/api/{table}", tags=[table])

    def user_of(request: Request):
        return request.state.user

    @router.get("")
    def list_items(page: int = 1, size: int = 10, keyword: str = "",
                   request: Request = None, user=Depends(get_current_user),
                   db: Session = Depends(get_db)):
        q = db.query(model).filter(getattr(model, "deleted", None) == 0) if hasattr(model, "deleted") else db.query(model)
        if keyword and search_fields:
            from sqlalchemy import or_
            conds = [getattr(model, f).like(f"%{keyword}%") for f in search_fields if hasattr(model, f)]
            if conds:
                q = q.filter(or_(*conds))
        total = q.count()
        rows = q.order_by(model.id.desc()).offset((page - 1) * size).limit(size).all()
        return ok({"total": total, "records": [serialize(r) for r in rows]})

    @router.get("/{item_id}")
    def get_item(item_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
        row = db.query(model).filter(model.id == item_id).first()
        if not row:
            raise BizError(404, "记录不存在", status=404)
        return ok(serialize(row))

    @router.post("")
    async def create_item(request: Request, user=Depends(get_current_user),
                          db: Session = Depends(get_db)):
        body = await yield_body(request)
        data = clean_payload(model, body)
        row = model(**data)
        if hasattr(row, "created_by"):
            row.created_by = user.username
        if hasattr(row, "created_at") and not getattr(row, "created_at", None):
            row.created_at = datetime.now()
        if hasattr(row, "deleted") and row.deleted is None:
            row.deleted = 0
        db.add(row)
        db.commit()
        db.refresh(row)
        return ok(serialize(row), "新增成功")

    @router.put("/{item_id}")
    async def update_item(item_id: int, request: Request, user=Depends(get_current_user),
                          db: Session = Depends(get_db)):
        body = await yield_body(request)
        row = db.query(model).filter(model.id == item_id).first()
        if not row:
            raise BizError(404, "记录不存在", status=404)
        for k, v in clean_payload(model, body).items():
            setattr(row, k, v)
        if hasattr(row, "updated_by"):
            row.updated_by = user.username
        db.commit()
        db.refresh(row)
        return ok(serialize(row), "更新成功")

    @router.delete("/{item_id}")
    def delete_item(item_id: int, user=Depends(get_current_user),
                    db: Session = Depends(get_db)):
        row = db.query(model).filter(model.id == item_id).first()
        if not row:
            raise BizError(404, "记录不存在", status=404)
        # GSP留档保护: 已批准的档案类记录不可物理删除
        if hasattr(row, "workflow_status") and getattr(row, "workflow_status") == "已批准":
            raise BizError(403, "已批准的档案不可删除（GSP要求资质档案保存至失效后2年），如需停用请修改状态为\"停用\"")
        if hasattr(row, "deleted"):
            row.deleted = 1
        else:
            db.delete(row)
        db.commit()
        return ok(None, "删除成功")

    return router


async def yield_body(request: Request) -> dict:
    import json
    raw = await request.body()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}


def serialize(row) -> dict:
    d = {}
    for c in row.__table__.columns:
        v = getattr(row, c.name)
        if isinstance(v, datetime):
            v = v.strftime("%Y-%m-%d %H:%M:%S")
        d[c.name] = v
    return d
