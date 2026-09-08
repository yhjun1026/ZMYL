# -*- coding: utf-8 -*-
"""通用工作流路由：三级审批 + 采购计划审批 + 采购入库五步流 + 转采购单"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..core.db import get_db
from ..core.security import get_current_user
from ..core.resp import ok, err
from ..models.all_tables import (
    Supplier, CustomerArchive, Personnel, HealthRecord, TrainingPlan,
    FirstFactoryAudit, FirstProductAudit, SystemProfile, CertUpdateRequest,
    PurchasePlan, ProcEquipment, ProcConsumable, OperationLog,
)

router = APIRouter(prefix="/api", tags=["workflow"])


def now_str(fmt="%Y-%m-%d %H:%M"):
    return datetime.now().strftime(fmt)


def log_op(db, action):
    db.add(OperationLog(time=now_str(), text=action, user="system",
                        created_at=now_str("%Y-%m-%d %H:%M:%S"), deleted=0))
    db.commit()


# ============ 两级审批流（质管员审核 -> 质量负责人批准） ============
# 适用: supplier customer_archive personnel health_record training_plan
#       first_factory_audit first_product_audit system_profile
TWO_LEVEL = {
    "supplier": (Supplier, "质管员", "质量负责人"),
    "customer_archive": (CustomerArchive, "质管员", "质量负责人"),
    "personnel": (Personnel, "质管员", "质量负责人"),
    "health_record": (HealthRecord, "质管员", "质量负责人"),
    "training_plan": (TrainingPlan, "质管员", "质量负责人"),
    "first_factory_audit": (FirstFactoryAudit, "质管员", "质量负责人"),
    "first_product_audit": (FirstProductAudit, "质管员", "质量负责人"),
    "system_profile": (SystemProfile, "质管员", "质量负责人"),
}

REVIEW_ROLES = {"sys_admin", "quality_staff", "quality_mgr"}
APPROVE_ROLES = {"sys_admin", "quality_mgr"}


class ActionBody(BaseModel):
    action: str = "approve"   # approve / reject
    opinion: str = ""


def _apply_review(obj, body, user):
    obj.reviewed_by = user
    obj.reviewed_at = now_str()
    obj.review_opinion = body.opinion or ""
    obj.workflow_status = "已审核" if body.action == "approve" else "已驳回"


def _apply_approve(obj, body, user):
    obj.approved_by = user
    obj.approved_at = now_str()
    obj.approval_opinion = body.opinion or ""
    obj.workflow_status = "已批准" if body.action == "approve" else "已驳回"


# ============ 资质更新申请（过期重审） ============
@router.put("/cert_update_request/{rid}/review")
def review_cert_update(rid: int, body: ActionBody,
                       db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role_code not in REVIEW_ROLES:
        raise HTTPException(403, "无审核权限")
    obj = db.get(CertUpdateRequest, rid)
    if not obj:
        raise HTTPException(404, "申请不存在")
    obj.reviewed_by = user.name or user.username
    obj.reviewed_at = now_str()
    obj.workflow_status = "已审核" if body.action == "approve" else "已驳回"
    log_op(db, f"审核资质更新#{rid} -> {obj.workflow_status}")
    return ok({"workflow_status": obj.workflow_status})


@router.put("/cert_update_request/{rid}/approve")
def approve_cert_update(rid: int, body: ActionBody,
                        db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role_code not in APPROVE_ROLES:
        raise HTTPException(403, "无审批权限")
    obj = db.get(CertUpdateRequest, rid)
    if not obj:
        raise HTTPException(404, "申请不存在")
    obj.approved_by = user.name or user.username
    obj.approved_at = now_str()
    obj.workflow_status = "已批准" if body.action == "approve" else "已驳回"
    log_op(db, f"批准资质更新#{rid} -> {obj.workflow_status}")
    return ok({"workflow_status": obj.workflow_status})


@router.put("/{resource}/{rid}/review")
def review_resource(resource: str, rid: int, body: ActionBody,
                    db: Session = Depends(get_db), user=Depends(get_current_user)):
    if resource not in TWO_LEVEL:
        raise HTTPException(404, "该模块不支持审核流")
    if user.role_code not in REVIEW_ROLES:
        raise HTTPException(403, "无审核权限（需质管员或质量负责人）")
    model, _, _ = TWO_LEVEL[resource]
    obj = db.get(model, rid)
    if not obj:
        raise HTTPException(404, "记录不存在")
    if getattr(obj, "workflow_status", None) != "待审核":
        raise HTTPException(400, f'仅"待审核"状态可审核（当前: {obj.workflow_status}）')
    _apply_review(obj, body, user.name or user.username)
    log_op(db, f"审核{resource}#{rid} -> {obj.workflow_status}")
    return ok({"workflow_status": obj.workflow_status, "message": f'审核完成: {obj.workflow_status}'})


@router.put("/{resource}/{rid}/approve")
def approve_resource(resource: str, rid: int, body: ActionBody,
                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    if resource not in TWO_LEVEL:
        raise HTTPException(404, "该模块不支持审批流")
    if user.role_code not in APPROVE_ROLES:
        raise HTTPException(403, "无审批权限（需质量负责人）")
    model, _, _ = TWO_LEVEL[resource]
    obj = db.get(model, rid)
    if not obj:
        raise HTTPException(404, "记录不存在")
    if getattr(obj, "workflow_status", None) != "已审核":
        raise HTTPException(400, f'仅"已审核"状态可最终批准（当前: {obj.workflow_status}）')
    _apply_approve(obj, body, user.name or user.username)
    log_op(db, f"批准{resource}#{rid} -> {obj.workflow_status}")
    return ok({"workflow_status": obj.workflow_status, "message": f'最终审批: {obj.workflow_status}'})


# ============ 采购计划审批（单级: 待审批 -> 已批准/已驳回） ============
@router.post("/purchase_plan/{rid}/review")
def review_purchase_plan(rid: int, body: ActionBody,
                         db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role_code not in {"sys_admin", "sales_director"}:
        raise HTTPException(403, "无审批权限（需销售总监）")
    plan = db.get(PurchasePlan, rid)
    if not plan:
        raise HTTPException(404, "采购计划不存在")
    if plan.workflow_status != "待审批":
        raise HTTPException(400, f'当前状态"{plan.workflow_status}"，无法审核')
    reviewer = user.name or user.username
    plan.reviewed_by = reviewer
    plan.reviewed_at = now_str()
    plan.review_opinion = body.opinion or ("同意，进入采购流程" if body.action == "approve" else "审核驳回")
    plan.workflow_status = "已批准" if body.action == "approve" else "已驳回"
    if hasattr(plan, "status"):
        plan.status = plan.workflow_status
    log_op(db, f"审核采购计划#{rid} -> {plan.workflow_status}")
    return ok({"workflow_status": plan.workflow_status, "message": f'采购计划{"已批准" if body.action=="approve" else "已驳回"}'})


@router.post("/purchase_plan/{rid}/convert-to-procurement")
def convert_plan(rid: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role_code not in {"sys_admin", "purchaser"}:
        raise HTTPException(403, "无权限（需采购员）")
    plan = db.get(PurchasePlan, rid)
    if not plan:
        raise HTTPException(404, "采购计划不存在")
    if plan.workflow_status != "已批准":
        raise HTTPException(400, '只有已批准的计划才能转为采购执行单')
    today = datetime.now().strftime("%Y-%m-%d")
    order_no = f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    is_consumable = (getattr(plan, "category", "") == "耗材")
    common = dict(order_no=order_no, linked_plan_id=plan.id,
                  factory_name=getattr(plan, "factory_name", "") or "",
                  equip_name=getattr(plan, "name", "") or "",
                  equip_model=getattr(plan, "spec_model", "") or "",
                  qty=getattr(plan, "qty", 1) or 1,
                  amount=getattr(plan, "budget", 0) or 0,
                  date=today, applicant=user.name or user.username,
                  workflow_status="待验收",
                  created_at=now_str("%Y-%m-%d %H:%M:%S"), deleted=0)
    if is_consumable:
        db.add(ProcConsumable(status="采购中", type="耗材采购", **common))
    else:
        db.add(ProcEquipment(status="采购中", type="设备采购", **common))
    plan.workflow_status = "已转采购"
    if hasattr(plan, "status"):
        plan.status = "已转采购"
    log_op(db, f"采购计划#{rid}转采购执行单 {order_no}")
    return ok({"order_no": order_no, "message": f"已生成采购执行单 {order_no}"})


# ============ 采购入库五步流 ============
# 待验收 -> 待质管审核 -> 待库管确认 -> 待负责人批准 -> 已入库
PROC_FLOW = {
    "proc_equipment": ProcEquipment,
    "proc_consumable": ProcConsumable,
}
PROC_STEPS = [
    # (action, from_status, to_status, roles, 说明)
    ("purchaser-accept", "待验收", "待质管审核", {"sys_admin", "purchaser"}, "采购员验收"),
    ("quality-review", "待质管审核", "待库管确认", {"sys_admin", "quality_staff", "quality_mgr"}, "质管审核"),
    ("warehouse-confirm", "待库管确认", "待负责人批准", {"sys_admin", "warehouse"}, "库管确认"),
    ("quality-approve", "待负责人批准", "已入库", {"sys_admin", "quality_mgr"}, "负责人批准"),
]


@router.post("/{resource}/{rid}/{action}")
def proc_flow(resource: str, rid: int, action: str, body: ActionBody,
              db: Session = Depends(get_db), user=Depends(get_current_user)):
    if resource not in PROC_FLOW:
        raise HTTPException(404, "不支持的操作")
    step = next((s for s in PROC_STEPS if s[0] == action), None)
    if not step:
        raise HTTPException(404, "未知操作")
    _, from_st, to_st, roles, label = step
    if user.role_code not in roles:
        raise HTTPException(403, f"无权限执行[{label}]（需角色: {'/'.join(roles)}）")
    obj = db.get(PROC_FLOW[resource], rid)
    if not obj:
        raise HTTPException(404, "记录不存在")
    if obj.workflow_status != from_st:
        raise HTTPException(400, f'当前状态"{obj.workflow_status}"，不能执行[{label}]')
    reject = body.action == "reject"
    obj.workflow_status = "已驳回" if reject else to_st
    reviewer = user.name or user.username
    if hasattr(obj, "review_trace"):
        obj.review_trace = ((getattr(obj, "review_trace", "") or "") +
                            f"{label}:{reviewer}:{'驳回' if reject else '通过'};")
    log_op(db, f"{resource}#{rid} {label} -> {obj.workflow_status}")
    return ok({"workflow_status": obj.workflow_status, "message": f'{label}完成: {obj.workflow_status}'})


# ============ 资质更新申请（过期重审） ============
@router.put("/cert_update_request/{rid}/review")
def review_cert_update(rid: int, body: ActionBody,
                       db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role_code not in REVIEW_ROLES:
        raise HTTPException(403, "无审核权限")
    obj = db.get(CertUpdateRequest, rid)
    if not obj:
        raise HTTPException(404, "申请不存在")
    obj.reviewed_by = user.name or user.username
    obj.reviewed_at = now_str()
    obj.workflow_status = "已审核" if body.action == "approve" else "已驳回"
    log_op(db, f"审核资质更新#{rid} -> {obj.workflow_status}")
    return ok({"workflow_status": obj.workflow_status})


@router.put("/cert_update_request/{rid}/approve")
def approve_cert_update(rid: int, body: ActionBody,
                        db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role_code not in APPROVE_ROLES:
        raise HTTPException(403, "无审批权限")
    obj = db.get(CertUpdateRequest, rid)
    if not obj:
        raise HTTPException(404, "申请不存在")
    obj.approved_by = user.name or user.username
    obj.approved_at = now_str()
    obj.workflow_status = "已批准" if body.action == "approve" else "已驳回"
    log_op(db, f"批准资质更新#{rid} -> {obj.workflow_status}")
    return ok({"workflow_status": obj.workflow_status})
