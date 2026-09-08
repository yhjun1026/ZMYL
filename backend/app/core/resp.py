# -*- coding: utf-8 -*-
"""统一响应与业务异常"""
from typing import Any, Optional
from fastapi import HTTPException


def ok(data: Any = None, msg: str = "success") -> dict:
    return {"code": 0, "msg": msg, "data": data}


def err(code: int, msg: str) -> dict:
    return {"code": code, "msg": msg, "data": None}


class BizError(HTTPException):
    def __init__(self, code: int, msg: str, status: Optional[int] = None):
        super().__init__(status_code=status or (code if code in (400, 401, 403, 404) else 400), detail=msg)
        self.biz_code = code
        self.biz_msg = msg
