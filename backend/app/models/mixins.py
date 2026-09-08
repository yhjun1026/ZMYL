# -*- coding: utf-8 -*-
"""通用Mixin：主键/审计字段/逻辑删除（声明式基类）"""
from datetime import datetime
from sqlalchemy import BigInteger, DateTime, SmallInteger, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class PkMixin(Base):
    __abstract__ = True
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, comment="主键")


class AuditMixin:
    created_by: Mapped[str] = mapped_column(String(50), default="", server_default="", comment="创建人")
    created_at: Mapped[datetime | None] = mapped_column(DateTime, comment="创建时间")
    updated_by: Mapped[str] = mapped_column(String(50), default="", server_default="", comment="更新人")
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp(), comment="更新时间"
    )


class DeletedMixin:
    deleted: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0, server_default="0", comment="逻辑删除")
