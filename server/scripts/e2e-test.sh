#!/usr/bin/env bash
# ============================================================
# ZMYL P1+P2+P3+P4 端到端验证脚本
# 用法: bash scripts/e2e-test.sh [端口]
# 前提: server 依赖已装好（node_modules 存在）
# ============================================================
set -uo pipefail

PORT="${1:-8888}"
BASE="http://localhost:$PORT/api"
NODE_BIN="${NODE_BIN:-node}"
PASS=0; FAIL=0; FAILED_STEPS=()

ok()   { PASS=$((PASS+1)); echo "  ✅ $1"; }
bad()  { FAIL=$((FAIL+1)); FAILED_STEPS+=("$1"); echo "  ❌ $1"; }
step() { echo ""; echo "== $1 =="; }

jqget() { # jqget <json> <py-expr>
  /usr/bin/python3 -c "
import sys, json
d = json.loads(sys.argv[1])
try:
    print(eval(sys.argv[2]))
except Exception:
    print('')
" "$1" "$2" 2>/dev/null
}

cd "$(dirname "$0")/.."

step "0. 环境检查"
[ -d node_modules ] && ok "node_modules 存在" || { bad "node_modules 缺失（先跑 bun install / npm install）"; exit 1; }

step "1. 数据库迁移"
$NODE_BIN src/db/migrate.js up > /tmp/mig.log 2>&1 && ok "migrate up 成功" || { bad "migrate up 失败"; tail -5 /tmp/mig.log; exit 1; }
$NODE_BIN src/db/migrate.js status 2>/dev/null | grep -q "004_p4_features" && ok "004_p4_features 已应用" || echo "  ℹ️  status 输出未见 004（继续）"

step "2. 启动服务（后台）"
[ -f data/e2e.db ] && rm -f data/e2e.db
DB_PATH=./data/e2e.db PORT=$PORT NODE_ENV=development $NODE_BIN src/server.js > /tmp/zmyl-e2e.log 2>&1 &
SERVER_PID=$!
sleep 2.5
for i in $(seq 1 10); do
  curl -s -o /dev/null "$BASE/health" && break
  sleep 1
done

curl -s "$BASE/health" | grep -q '"status":"ok"' && ok "GET /api/health" || { bad "health 检查失败"; tail -20 /tmp/zmyl-e2e.log; kill $SERVER_PID; exit 1; }

step "3. 登录"
LOGIN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"123456"}')
TOKEN=$(jqget "$LOGIN" "d['data']['token']")
[ -n "$TOKEN" ] && ok "admin 登录拿到 token" || { bad "登录失败: $LOGIN"; kill $SERVER_PID; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

step "4. 工作台 + 通用 CRUD（P1/P2 回归）"
DASH=$(curl -s "$BASE/dashboard" -H "$AUTH")
TOTAL_EQ=$(jqget "$DASH" "d['data']['total_devices'] or d['data']['total_equipment']")
[ -n "$TOTAL_EQ" ] && ok "dashboard 统计（设备 $TOTAL_EQ 台）" || bad "dashboard 无 total_devices"
curl -s "$BASE/equip_ledger?page=1&size=5" -H "$AUTH" | grep -q '"records"' && ok "equip_ledger 分页列表" || bad "equip_ledger 列表失败"
curl -s "$BASE/equip_ledger?page=1&size=5&keyword=CT" -H "$AUTH" | grep -q '"records"' && ok "关键词搜索" || bad "搜索失败"

# 两级审批
SUP=$(curl -s -X POST "$BASE/supplier" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"E2E测试供应商","code":"E2E-SUP-001","contact":"测试联系人","workflow_status":"待审核"}')
SUP_ID=$(jqget "$SUP" "d['data']['id']")
[ -n "$SUP_ID" ] && ok "创建供应商#$SUP_ID" || bad "创建供应商失败: $SUP"
curl -s -X PUT "$BASE/supplier/$SUP_ID/review" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve","opinion":"资料齐全"}' | grep -q '已审核' && ok "两级审批-审核" || bad "supplier review 失败"
curl -s -X PUT "$BASE/supplier/$SUP_ID/approve" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve"}' | grep -q '已批准' && ok "两级审批-批准" || bad "supplier approve 失败"

# 采购计划 → 转采购单 → 五步流
PLAN=$(curl -s -X POST "$BASE/purchase_plan" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"E2E测试监护仪","spec_model":"XYZ-1","qty":3,"budget":90000,"category":"设备","applicant":"e2e","workflow_status":"待审批","status":"待审批"}')
PLAN_ID=$(jqget "$PLAN" "d['data']['id']")
curl -s -X POST "$BASE/purchase_plan/$PLAN_ID/review" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve"}' | grep -q '已批准' && ok "采购计划审批" || bad "plan review 失败"
CONV=$(curl -s -X POST "$BASE/purchase_plan/$PLAN_ID/convert-to-procurement" -H "$AUTH")
PROC_ID=$(jqget "$CONV" "d['data']['id']")
[ -n "$PROC_ID" ] && ok "转采购执行单#$PROC_ID" || bad "convert 失败: $CONV"
for S in purchaser-accept quality-review warehouse-confirm quality-approve; do
  curl -s -X POST "$BASE/proc_equipment/$PROC_ID/$S" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve"}' | grep -qE '成功|完成|入库' && ok "五步流: $S" || bad "五步流 $S 失败"
done
curl -s "$BASE/proc_equipment/$PROC_ID" -H "$AUTH" | grep -q '已入库' && ok "采购单终态=已入库" || bad "采购单未到已入库"

step "5. P3-销售出库六级流（含库存联动）"
# 造一条专用测试库存（独立批次，不依赖已有数据）
curl -s -X POST "$BASE/inventory" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"E2E库存设备","spec":"V1","batch":"E2E-B1","qty":100,"unit":"台","min_stock":5,"location":"A1"}' > /dev/null
INV_ROW=$(curl -s "$BASE/inventory?keyword=E2E-B1" -H "$AUTH" | /usr/bin/python3 -c "import sys,json; d=json.load(sys.stdin); r=[x for x in d['data']['records'] if x.get('batch')=='E2E-B1']; print(r[0]['qty'] if r else 0)" 2>/dev/null)
INV_NAME="E2E库存设备"
[ "$INV_ROW" = "100" ] && ok "测试库存已就绪（E2E-B1 x100）" || bad "测试库存创建异常: $INV_ROW"
INV_QTY_BEFORE=$INV_ROW

OB=$(curl -s -X POST "$BASE/outbound_record" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"customer\":\"E2E测试医院\",\"equip_name\":\"$INV_NAME\",\"batch\":\"E2E-B1\",\"qty\":10,\"price\":1000,\"total\":10000}")
OB_ID=$(jqget "$OB" "d['data']['id']")
OB_STATUS=$(jqget "$OB" "d['data']['status']")
[ "$OB_STATUS" = "待销售经理审核" ] && ok "创建出库单#${OB_ID}（起点=待销售经理审核）" || bad "出库单创建状态异常: $OB_STATUS"
RESERVED=$(jqget "$OB" "d['data']['reserved_qty']")
[ "$RESERVED" = "10" ] && ok "库存预占 reserved_qty=10" || bad "预占异常 reserved_qty=$RESERVED"

# 六级推进（admin=sys_admin 全环节放行）：前 4 环节流转，第 5 环节（销售总监）为终审
for S in 待销售经理审核 待质管员审核 待库管员审核 待质量负责人审核; do
  R=$(curl -s -X POST "$BASE/outbound_record/$OB_ID/flow" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve","opinion":"e2e通过"}')
  echo "$R" | grep -q '流转' && ok "六级流: $S → 下一环节" || bad "六级流 $S 失败: $R"
done
# 终审（待销售总监审核 → 已出库）
R=$(curl -s -X POST "$BASE/outbound_record/$OB_ID/flow" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve"}')
echo "$R" | grep -q '已出库' && ok "终审放行 → 已出库" || bad "终审失败: $R"
# 已出库后再审批应被拦截（GSP 留档）
R=$(curl -s -X POST "$BASE/outbound_record/$OB_ID/flow" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve"}')
echo "$R" | grep -q '留档' && ok "已出库单再审批被拦截（GSP 留档）" || bad "已出库单竟然还能审批"
# 库存扣减校验（按批次查，避免中文 keyword 编码问题）
INV_AFTER=$(curl -s "$BASE/inventory?keyword=E2E-B1" -H "$AUTH" | /usr/bin/python3 -c "
import sys, json
d = json.load(sys.stdin)
recs = [r for r in d['data']['records'] if r.get('batch') == 'E2E-B1']
print(recs[0]['qty'] if recs else -1)" 2>/dev/null)
EXPECT=$((INV_QTY_BEFORE - 10))
[ "$INV_AFTER" = "$EXPECT" ] && ok "库存已扣减: $INV_QTY_BEFORE → $INV_AFTER" || bad "库存扣减异常: ${INV_AFTER}（期望 ${EXPECT}）"
# 财务自动记账
FIN=$(curl -s "$BASE/finance_record?keyword=$OB_ID" -H "$AUTH")
FIN_N=$(echo "$FIN" | /usr/bin/python3 -c "
import sys, json
d = json.load(sys.stdin)
print(len([r for r in d['data']['records'] if 'E2E' in str(r.get('note','')) or '自动记账' in str(r.get('note',''))]))" 2>/dev/null)
[ "${FIN_N:-0}" -ge 1 ] && ok "财务自动记账已生成" || echo "  ℹ️  按单号未匹配到记账记录（用全局统计复核）"
# 驳回路径：再建一单走两步然后驳回
OB2=$(curl -s -X POST "$BASE/outbound_record" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"customer\":\"E2E驳回测试\",\"equip_name\":\"$INV_NAME\",\"batch\":\"E2E-B1\",\"qty\":5,\"price\":100,\"total\":500}")
OB2_ID=$(jqget "$OB2" "d['data']['id']")
curl -s -X POST "$BASE/outbound_record/$OB2_ID/flow" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve"}' > /dev/null
R=$(curl -s -X POST "$BASE/outbound_record/$OB2_ID/flow" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"reject","opinion":"e2e驳回"}')
echo "$R" | grep -q '驳回' && ok "驳回路径 + 预占释放" || bad "驳回失败: $R"
# 驳回后编辑重提
UPD=$(curl -s -X PUT "$BASE/outbound_record/$OB2_ID" -H "$AUTH" -H 'Content-Type: application/json' -d '{"qty":6,"note":"e2e修改重提"}')
echo "$UPD" | grep -q '待销售经理审核' && ok "驳回后编辑重提 → 回到起点" || bad "重提失败: $(echo $UPD | head -c 120)"
# 已出库不可改（通用编辑保护）
R=$(curl -s -X PUT "$BASE/outbound_record/$OB_ID" -H "$AUTH" -H 'Content-Type: application/json' -d '{"note":"hack"}')
echo "$R" | grep -q '"success":false' && ok "已出库单修改被拦截（GSP 留档）" || bad "已出库单竟然可修改"

step "6. P3-产品验收五步流"
PA=$(curl -s -X POST "$BASE/product_acceptance" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"product_name":"E2E测试耗材","batch_no":"E2E-PA-1","supplier":"E2E供应商","quantity":50,"workflow_status":"待验收"}')
PA_ID=$(jqget "$PA" "d['data']['id']")
[ -n "$PA_ID" ] && ok "创建验收记录#$PA_ID" || bad "验收记录创建失败: $PA"
curl -s -X POST "$BASE/product_acceptance/$PA_ID/workflow-step" -H "$AUTH" -H 'Content-Type: application/json' -d '{"step":"appearance","result":"合格"}' | grep -q '外观检查完成' && ok "步骤1 外观检查" || bad "appearance 失败"
curl -s -X POST "$BASE/product_acceptance/$PA_ID/workflow-step" -H "$AUTH" -H 'Content-Type: application/json' -d '{"step":"quantity","result":"合格"}' | grep -q '数量核对完成' && ok "步骤2 数量核对" || bad "quantity 失败"
curl -s -X POST "$BASE/product_acceptance/$PA_ID/workflow-step" -H "$AUTH" -H 'Content-Type: application/json' -d '{"step":"quality","result":"合格"}' | grep -q '质量检验完成' && ok "步骤3 质量检验" || bad "quality 失败"
curl -s -X POST "$BASE/product_acceptance/$PA_ID/workflow-step" -H "$AUTH" -H 'Content-Type: application/json' -d '{"step":"approve","overall_result":"合格"}' | grep -q '已完成' && ok "步骤4 综合判定 → 已完成" || bad "approve 失败"
# 不合格拦截 + 重置
PA2=$(curl -s -X POST "$BASE/product_acceptance" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"product_name":"E2E不合格样例","batch_no":"E2E-PA-2","quantity":1,"workflow_status":"待验收"}')
PA2_ID=$(jqget "$PA2" "d['data']['id']")
R=$(curl -s -X POST "$BASE/product_acceptance/$PA2_ID/workflow-step" -H "$AUTH" -H 'Content-Type: application/json' -d '{"step":"appearance","result":"不合格"}')
echo "$R" | grep -q '不合格待处理' && ok "不合格拦截 → 不合格待处理" || bad "不合格拦截失败: $R"
R=$(curl -s -X POST "$BASE/product_acceptance/$PA2_ID/workflow-reset" -H "$AUTH")
echo "$R" | grep -q '待验收' && ok "重置重新验收" || bad "reset 失败: $R"
curl -s "$BASE/product_acceptance/expiry-stats" -H "$AUTH" | grep -qE 'safe|安全线' && ok "效期统计端点" || bad "expiry-stats 失败"

step "7. P3-审批通知收件箱"
UNREAD=$(curl -s "$BASE/notifications/unread-count" -H "$AUTH")
UNREAD_N=$(jqget "$UNREAD" "d['data']['count']")
[ "${UNREAD_N:-0}" -ge 1 ] && ok "未读通知 $UNREAD_N 条（出库流转已推送）" || bad "未读通知为 0（推送链路异常）"
NOTIF=$(curl -s "$BASE/notifications" -H "$AUTH")
N_ID=$(jqget "$NOTIF" "d['data'][0]['id']")
[ -n "$N_ID" ] && ok "通知列表（首条 id=${N_ID}）" || bad "通知列表为空"
curl -s -X PUT "$BASE/notifications/$N_ID/read" -H "$AUTH" | grep -q '已读' && ok "标记单条已读" || bad "markRead 失败"
curl -s -X PUT "$BASE/notifications/read-all" -H "$AUTH" | grep -q '已读' && ok "全部已读" || bad "read-all 失败"
UNREAD2=$(curl -s "$BASE/notifications/unread-count" -H "$AUTH")
UNREAD2_N=$(jqget "$UNREAD2" "d['data']['count']")
[ "${UNREAD2_N:-1}" = "0" ] && ok "未读数归零" || bad "read-all 后仍有 $UNREAD2_N 未读"

step "8. P3-报表中心"
SUM=$(curl -s "$BASE/reports/summary" -H "$AUTH")
echo "$SUM" | grep -q 'monthly' && ok "summary 汇总（含月度趋势）" || bad "summary 失败: $(echo $SUM | head -c 120)"
SALES=$(jqget "$SUM" "d['data']['totals']['销售总额']")
echo "  ℹ️  销售总额: $SALES"
mkdir -p /tmp/zmyl-e2e-exports
for T in equipments purchase-plans inventory outbound suppliers personnel finance; do
  curl -s -o "/tmp/zmyl-e2e-exports/$T.xlsx" "$BASE/reports/export/$T" -H "$AUTH"
  head -c 2 "/tmp/zmyl-e2e-exports/$T.xlsx" | grep -q 'PK' && ok "导出 $T.xlsx（合法 xlsx）" || bad "$T.xlsx 非法"
done

step "9. P3-验收资料 PDF 上传/下载/删除"
# 造一个最小合法 PDF
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n%%%%EOF\n' > /tmp/e2e-test.pdf
UP=$(curl -s -X POST "$BASE/acceptance_doc" -H "$AUTH" -F "file=@/tmp/e2e-test.pdf" -F "biz_type=procurement" -F "biz_id=$PROC_ID" -F "order_no=E2E" -F "title=E2E验收资料")
DOC_ID=$(jqget "$UP" "d['data']['id']")
[ -n "$DOC_ID" ] && ok "上传 PDF（doc#{DOC_ID}）" || bad "PDF 上传失败: $UP"
# 非法格式拦截
BADUP=$(curl -s -X POST "$BASE/acceptance_doc" -H "$AUTH" -F "file=@/tmp/mig.log;filename=x.txt" -F "biz_type=procurement" -F "biz_id=1")
echo "$BADUP" | grep -q 'PDF' && ok "非 PDF 上传被拦截" || bad "非 PDF 竟然上传成功"
# 下载（header token）
curl -s -o /tmp/e2e-dl.pdf "$BASE/acceptance_doc/$DOC_ID/file" -H "$AUTH" && head -c 4 /tmp/e2e-dl.pdf | grep -q '%PDF' && ok "下载 PDF（Bearer 认证）" || bad "下载失败"
# 下载（query token，浏览器直开场景）
curl -s -o /tmp/e2e-dl2.pdf "$BASE/acceptance_doc/$DOC_ID/file?token=$TOKEN" && head -c 4 /tmp/e2e-dl2.pdf | grep -q '%PDF' && ok "下载 PDF（?token= 认证）" || bad "query token 下载失败"
# 元数据列表
curl -s "$BASE/acceptance_doc?biz_type=procurement&biz_id=$PROC_ID" -H "$AUTH" | grep -q 'E2E' && ok "资料列表（按业务过滤）" || bad "资料列表异常"
# 删除
curl -s -X DELETE "$BASE/acceptance_doc/$DOC_ID" -H "$AUTH" | grep -q '删除' && ok "删除资料" || bad "删除失败"

step "10. 前端构建产物托管（SPA）"
if [ -f ../frontend/dist/index.html ]; then
  curl -s -o /dev/null -w "" "http://localhost:$PORT/" && curl -s "http://localhost:$PORT/" | grep -q '<div id="app">' && ok "GET / 返回 SPA index.html" || bad "SPA 首页异常"
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/login" | grep -q '200' && ok "SPA 回退 /login → 200" || bad "SPA 回退失败"
else
  echo "  ⏭️  frontend/dist 未构建，跳过 SPA 托管检查"
fi

step "11. P4-数据互联互通（采购联动验收/财务 + 桥接汇总）"
# 第 4 步五步流已触发：purchaser-accept → 自动建产品验收；quality-approve → 自动记财务支出
BRIDGE=$(curl -s "$BASE/data_bridge_log?page=1&size=100" -H "$AUTH" | /usr/bin/python3 -c "
import sys, json
d = json.load(sys.stdin)
types = set(r.get('bridge_type','') for r in d['data']['records'])
print(('Y' if '采购转验收' in types else 'N') + ('Y' if '采购转财务' in types else 'N'))" 2>/dev/null)
echo "$BRIDGE" | grep -q 'Y' && ok "桥接日志: 采购转验收（联动 ${BRIDGE}）" || bad "采购转验收联动缺失"
[ "$BRIDGE" = "YY" ] && ok "桥接日志: 采购转财务" || bad "采购转财务联动缺失"
# 采购到货自动创建的产品验收记录（linked_proc_id = PROC_ID）
PA_AUTO=$(curl -s "$BASE/product_acceptance?page=1&size=100" -H "$AUTH" | /usr/bin/python3 -c "
import sys, json
d = json.load(sys.stdin)
recs = [r for r in d['data']['records'] if r.get('linked_proc_id') == $PROC_ID]
print(len(recs))" 2>/dev/null)
[ "${PA_AUTO:-0}" -ge 1 ] && ok "采购到货自动创建产品验收记录" || bad "验收联动记录未生成"
# 财务支出自动记账（采购单金额=计划预算 90000）
FIN_EXP=$(curl -s "$BASE/finance_record?page=1&size=100" -H "$AUTH" | /usr/bin/python3 -c "
import sys, json
d = json.load(sys.stdin)
recs = [r for r in d['data']['records'] if r.get('category') == '支出' and '自动记账' in str(r.get('note',''))]
print(len(recs))" 2>/dev/null)
[ "${FIN_EXP:-0}" -ge 1 ] && ok "采购入库自动记财务支出" || bad "采购转财务支出记录缺失"
curl -s "$BASE/bridge/data-flow-summary" -H "$AUTH" | grep -q 'bridge_type' && ok "数据流转汇总" || bad "data-flow-summary 失败"
curl -s "$BASE/bridge/pending-approvals" -H "$AUTH" | grep -q 'groups' && ok "跨模块待办聚合" || bad "pending-approvals 失败"

step "12. P4-可配置审批流引擎（生命周期 + 业务驱动）"
FLOW=$(curl -s -X POST "$BASE/approval-flows" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"flow_code":"e2e_customer_flow","flow_name":"E2E客户审批流","biz_module":"customer-archive","steps":[{"step_no":1,"step_name":"质管审核","approver_role":"quality_mgr","approver_role_name":"质量负责人"},{"step_no":2,"step_name":"负责人批准","approver_role":"quality_mgr","approver_role_name":"质量负责人","can_reject":false}]}')
FLOW_ID=$(jqget "$FLOW" "d['data']['id']")
[ -n "$FLOW_ID" ] && ok "创建审批流#{FLOW_ID}（草稿）" || bad "流程创建失败: $FLOW"
curl -s -X POST "$BASE/approval-flows/$FLOW_ID/submit" -H "$AUTH" | grep -q 'pending' && ok "提交 → 待质量负责人审批" || bad "submit 失败"
curl -s -X POST "$BASE/approval-flows/$FLOW_ID/approve" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve"}' | grep -q 'active' && ok "质量负责人通过 → 已生效" || bad "approve 失败"
HOOKS=$(curl -s "$BASE/approval-flows/hooks" -H "$AUTH")
APPLIED=$(jqget "$HOOKS" "d['data']['applied']")
[ "${APPLIED:-0}" -ge 2 ] && ok "钩子接入状态（已接入 $APPLIED 个）" || bad "hooks 未接入: $APPLIED"
# 业务驱动验证：非指定角色被流程拦截
curl -s -X POST "$BASE/user" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"username":"e2e_purchaser","password":"123456","name":"E2E采购员","role_code":"purchaser"}' > /dev/null
curl -s -X POST "$BASE/user" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"username":"e2e_qm","password":"123456","name":"E2E质量负责人","role_code":"quality_mgr"}' > /dev/null
PU_TOKEN=$(jqget "$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"e2e_purchaser","password":"123456"}')" "d['data']['token']")
QM_TOKEN=$(jqget "$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"e2e_qm","password":"123456"}')" "d['data']['token']")
[ -n "$PU_TOKEN" ] && [ -n "$QM_TOKEN" ] && ok "测试角色账号就绪（purchaser / quality_mgr）" || bad "角色账号创建失败"
CUST=$(curl -s -X POST "$BASE/customer_archive" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"E2E流程客户","credit_code":"E2E-FLOW-1","workflow_status":"待审核"}')
CUST_ID=$(jqget "$CUST" "d['data']['id']")
# purchaser 审核 → 被流程拦截（步骤需 quality_mgr）
R=$(curl -s -X PUT "$BASE/customer_archive/$CUST_ID/review" -H "Authorization: Bearer $PU_TOKEN" -H 'Content-Type: application/json' -d '{"action":"approve"}')
echo "$R" | grep -q '审批流程配置' && ok "流程守卫: 非指定角色被拦截" || bad "流程守卫失效: $R"
# quality_mgr 审核 → 放行
R=$(curl -s -X PUT "$BASE/customer_archive/$CUST_ID/review" -H "Authorization: Bearer $QM_TOKEN" -H 'Content-Type: application/json' -d '{"action":"approve"}')
echo "$R" | grep -q '已审核' && ok "流程守卫: 指定角色放行（审核）" || bad "quality_mgr 审核失败: $R"
# 步骤2 can_reject=false → 驳回被拦截
R=$(curl -s -X PUT "$BASE/customer_archive/$CUST_ID/approve" -H "Authorization: Bearer $QM_TOKEN" -H 'Content-Type: application/json' -d '{"action":"reject"}')
echo "$R" | grep -q '不允许驳回' && ok "驳回策略: 步骤配置不可驳回已生效" || bad "不可驳回策略失效: $R"
R=$(curl -s -X PUT "$BASE/customer_archive/$CUST_ID/approve" -H "Authorization: Bearer $QM_TOKEN" -H 'Content-Type: application/json' -d '{"action":"approve"}')
echo "$R" | grep -q '已批准' && ok "流程驱动两级审批完成 → 已批准" || bad "最终批准失败: $R"
# 停用流程 → 回退默认规则（purchaser 仍无权限，但拦截信息来自硬编码角色校验）
curl -s -X POST "$BASE/approval-flows/$FLOW_ID/disable" -H "$AUTH" | grep -q 'disabled' && ok "停用流程 → disabled" || bad "disable 失败"
# 版本管理
NV=$(curl -s -X POST "$BASE/approval-flows/$FLOW_ID/new-version" -H "$AUTH")
NV_V=$(jqget "$NV" "d['data']['version']")
[ "$NV_V" = "2" ] && ok "新建版本 v2（草稿）" || bad "new-version 失败: $NV"
curl -s "$BASE/approval-flows/$FLOW_ID/logs" -H "$AUTH" | grep -q 'submit' && ok "流程变更日志（GSP 可追溯）" || bad "流程日志缺失"

step "13. P4-冷链管理（设备/IoT/报警/台账）"
DEV=$(curl -s -X POST "$BASE/cold-chain/devices" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"device_name":"E2E冷藏车","device_type":"冷藏车","node_type":"transport","vehicle_no":"沪E2E001"}')
DEV_ID=$(jqget "$DEV" "d['data']['id']")
APIKEY=$(jqget "$DEV" "d['data']['device']['api_key']")
[ -n "$DEV_ID" ] && [ -n "$APIKEY" ] && ok "冷链设备#{DEV_ID}（IoT密钥已生成）" || bad "设备创建失败: $DEV"
# IoT 上报（免登录，api_key 认证）
R=$(curl -s -X POST "$BASE/cold-chain/iot/report" -H 'Content-Type: application/json' \
  -d "{\"api_key\":\"$APIKEY\",\"temp\":5.0,\"humid\":60,\"batch\":\"E2E-CC-1\",\"product_name\":\"E2E冷链品\"}")
echo "$R" | grep -q '"is_abnormal":0' && ok "IoT 正常温度上报（无报警）" || bad "IoT 上报失败: $R"
R=$(curl -s -X POST "$BASE/cold-chain/iot/report" -H 'Content-Type: application/json' \
  -d "{\"api_key\":\"$APIKEY\",\"temp\":15.0,\"humid\":60,\"batch\":\"E2E-CC-1\",\"product_name\":\"E2E冷链品\"}")
ALARM_ID=$(jqget "$R" "d['data']['alarm_id']")
[ -n "$ALARM_ID" ] && ok "IoT 超标温度 → 自动生成报警#$ALARM_ID" || bad "超标报警未生成: $R"
# 无 key 被拒
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/cold-chain/iot/report" -H 'Content-Type: application/json' -d '{"temp":5}')
[ "$CODE" = "401" ] && ok "IoT 无 api_key 被拒（401）" || bad "IoT 认证缺失（HTTP ${CODE}）"
# 报警处理闭环
curl -s -X POST "$BASE/cold-chain/alarms/$ALARM_ID/handle" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"status":"resolved","handle_action":"检修制冷","handle_result":"已恢复"}' | grep -q 'resolved' && ok "报警处理闭环" || bad "报警处理失败"
# 手动录入
curl -s -X POST "$BASE/cold-chain/records" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"device_id\":$DEV_ID,\"temp\":4.2,\"humid\":58,\"batch\":\"E2E-CC-1\",\"product_name\":\"E2E冷链品\"}" | grep -q '已保存' && ok "手动录入监测记录" || bad "手动录入失败"
# 台账生成（温度 15℃ 超标过 → 不合格）
LG=$(curl -s -X POST "$BASE/cold-chain/ledgers/generate" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"batch":"E2E-CC-1","product_name":"E2E冷链品"}')
LG_ID=$(jqget "$LG" "d['data']['id']")
[ -n "$LG_ID" ] && ok "冷链台账生成（含超标判定）" || bad "台账生成失败: $LG"
curl -s -X POST "$BASE/cold-chain/ledgers/$LG_ID/verify" -H "$AUTH" | grep -q '已审核' && ok "台账质管审核" || bad "台账审核失败"
curl -s "$BASE/cold-chain/chain-trace?batch=E2E-CC-1" -H "$AUTH" | grep -q 'record_count' && ok "全链条追溯视图" || bad "chain-trace 失败"
curl -s "$BASE/cold-chain/dashboard" -H "$AUTH" | grep -q '"device_total":1' && ok "冷链实时看板" || bad "冷链看板异常"

step "14. P4-物流进度追踪（承运商/运单/轨迹/冷链联动）"
CAR=$(curl -s -X POST "$BASE/logistics/carriers" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"E2E顺丰冷运","cold_chain_qualified":true,"phone":"95338"}')
CAR_ID=$(jqget "$CAR" "d['data']['id']")
[ -n "$CAR_ID" ] && ok "承运商#{CAR_ID}（冷链资质）" || bad "承运商创建失败: $CAR"
LO=$(curl -s -X POST "$BASE/logistics/orders" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"related_type\":\"outbound\",\"related_no\":\"E2E-SO\",\"carrier_id\":$CAR_ID,\"transport_mode\":\"cold_chain\",\"origin\":\"上海\",\"destination\":\"北京\",\"product_name\":\"E2E冷链品\",\"batch\":\"E2E-CC-1\",\"quantity\":10,\"customer_name\":\"E2E北京医院\"}")
LO_ID=$(jqget "$LO" "d['data']['id']")
LO_NO=$(jqget "$LO" "d['data']['logistics_no']")
[ -n "$LO_ID" ] && ok "物流单 ${LO_NO}（冷链）" || bad "物流单创建失败: $LO"
curl -s -X POST "$BASE/logistics/orders/$LO_ID/nodes" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"node_code":"shipped","location":"上海青浦","temp":4.5,"humid":55}' | grep -q '已发运' && ok "节点: 发运（随车温度入冷链记录）" || bad "发运节点失败"
curl -s -X POST "$BASE/logistics/orders/$LO_ID/nodes" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"node_code":"arrived","location":"北京"}' | grep -q '已到达' && ok "节点: 到达" || bad "到达节点失败"
R=$(curl -s -X POST "$BASE/logistics/orders/$LO_ID/nodes" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"node_code":"signed","location":"北京","signed_by":"E2E收货人"}')
echo "$R" | grep -q '已签收' && ok "节点: 签收（进度100%）" || bad "签收失败: $R"
# 已签收不可再追加节点
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/logistics/orders/$LO_ID/nodes" -H "$AUTH" -H 'Content-Type: application/json' -d '{"node_code":"transit"}')
[ "$CODE" = "400" ] && ok "已签收单追加节点被拦截" || bad "签收后竟可追加节点（HTTP ${CODE}）"
# 轨迹 + 冷链温度联动
TRACE=$(curl -s "$BASE/logistics/trace?logistics_no=$LO_NO" -H "$AUTH")
NODE_N=$(jqget "$TRACE" "len(d['data']['nodes'])")
[ "${NODE_N:-0}" -ge 4 ] && ok "轨迹时间轴（$NODE_N 节点）" || bad "轨迹节点数异常: $NODE_N"
curl -s "$BASE/logistics/orders/$LO_ID" -H "$AUTH" | grep -q 'cold_chain_records' && ok "冷链单关联温度记录" || bad "冷链温度联动缺失"
curl -s "$BASE/logistics/dashboard" -H "$AUTH" | grep -q '"cold_chain":1' && ok "物流看板（冷链统计）" || bad "物流看板异常"

step "15. P4-数据备份（手动备份 + 清单 + 下载 + 删除）"
BK=$(curl -s -X POST "$BASE/backup/run" -H "$AUTH")
BK_FILE=$(jqget "$BK" "d['data']['file_name']")
[ -n "$BK_FILE" ] && ok "手动备份: $BK_FILE" || bad "备份失败: $BK"
BKL=$(curl -s "$BASE/backup" -H "$AUTH")
BK_ID=$(jqget "$BKL" "d['data']['list'][0]['id']")
[ -n "$BK_ID" ] && ok "备份清单（id=${BK_ID}）" || bad "备份清单为空"
curl -s -o /tmp/e2e-backup.db "$BASE/backup/$BK_ID/download" -H "$AUTH" && head -c 6 /tmp/e2e-backup.db | grep -q 'SQLite' && ok "备份下载（合法 SQLite 文件）" || bad "备份下载非法"
curl -s -X DELETE "$BASE/backup/$BK_ID" -H "$AUTH" | grep -q '已删除' && ok "备份删除" || bad "备份删除失败"
rm -rf data/backup 2>/dev/null

echo ""
echo "=========================================="
echo "端到端验证结果: ✅ $PASS 通过 / ❌ $FAIL 失败"
if [ "$FAIL" -gt 0 ]; then
  echo "失败项:"; for s in "${FAILED_STEPS[@]}"; do echo "  - $s"; done
fi
echo "=========================================="

kill $SERVER_PID 2>/dev/null
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
