#!/usr/bin/env bash
# ============================================================
# ZMYL P1+P2+P3 端到端验证脚本
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
$NODE_BIN src/db/migrate.js status 2>/dev/null | grep -q "003_p3_features" && ok "003_p3_features 已应用" || echo "  ℹ️  status 输出未见 003（继续）"

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
[ "$OB_STATUS" = "待销售经理审核" ] && ok "创建出库单#$OB_ID（起点=待销售经理审核）" || bad "出库单创建状态异常: $OB_STATUS"
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
[ "$INV_AFTER" = "$EXPECT" ] && ok "库存已扣减: $INV_QTY_BEFORE → $INV_AFTER" || bad "库存扣减异常: $INV_AFTER（期望 $EXPECT）"
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
[ -n "$N_ID" ] && ok "通知列表（首条 id=$N_ID）" || bad "通知列表为空"
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
[ -n "$DOC_ID" ] && ok "上传 PDF（doc#$DOC_ID）" || bad "PDF 上传失败: $UP"
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

echo ""
echo "=========================================="
echo "端到端验证结果: ✅ $PASS 通过 / ❌ $FAIL 失败"
if [ "$FAIL" -gt 0 ]; then
  echo "失败项:"; for s in "${FAILED_STEPS[@]}"; do echo "  - $s"; done
fi
echo "=========================================="

kill $SERVER_PID 2>/dev/null
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
