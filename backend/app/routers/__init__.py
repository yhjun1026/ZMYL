# -*- coding: utf-8 -*-
from .auth import router as auth_router
from .user import router as user_router
from .dashboard import router as dashboard_router
from .crud import make_router
from .modules import MODULES
from .workflow import router as workflow_router

crud_routers = []
for table, _title, search in MODULES:
    crud_routers.append(make_router(table, search))

__all__ = ["auth_router", "user_router", "dashboard_router", "crud_routers", "workflow_router", "MODULES"]
