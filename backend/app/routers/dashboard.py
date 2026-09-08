# -*- coding: utf-8 -*-
"""工作台统计"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..core.db import get_db
from ..core.security import get_current_user
from ..core.resp import ok
from ..models.all_tables import EquipLedger, Inventory, RepairOrder, AdverseEvent, OutboundRecord, RecallRecord, ExpiryWarning

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(user=Depends(get_current_user), db: Session = Depends(get_db)):
    def cnt(m, extra=None):
        q = db.query(func.count(m.id)).filter(m.deleted == 0)
        if extra is not None:
            q = q.filter(extra)
        return q.scalar() or 0

    return ok({
        "equipTotal": cnt(EquipLedger),
        "inventoryTotal": cnt(Inventory),
        "outboundMonth": cnt(OutboundRecord),
        "repairPending": cnt(RepairOrder, RepairOrder.status.in_(["待处理", "维修中", "pending", "repairing"])),
        "adverseTotal": cnt(AdverseEvent),
        "recallActive": cnt(RecallRecord, RecallRecord.status.in_(["进行中", "active"])),
        "expiringSoon": db.query(func.count(ExpiryWarning.id))
            .filter(ExpiryWarning.deleted == 0, ExpiryWarning.expire_date.isnot(None),
                    func.datediff(ExpiryWarning.expire_date, func.now()) <= 90,
                    func.datediff(ExpiryWarning.expire_date, func.now()) >= 0).scalar() or 0,
    })
