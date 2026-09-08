<template>
  <div>
    <!-- 看板 -->
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">物流单总数</div><div class="stat-value">{{ summary.total || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">运输中</div><div class="stat-value" style="color:#409eff">{{ summary.in_transit || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">待发货</div><div class="stat-value">{{ summary.pending || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">异常</div><div class="stat-value" style="color:#f56c6c">{{ summary.exception || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">冷链单</div><div class="stat-value" style="color:#13c2c2">{{ summary.cold_chain || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">冷链待处理报警</div><div class="stat-value" style="color:#e6a23c">{{ summary.cc_pending_alarms || 0 }}</div></div>
    </div>

    <!-- 单号追踪 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">物流单号追踪</div></div>
      <div class="trace-bar">
        <input v-model="traceNo" placeholder="输入物流单号，如 WL-20260909-001" @keyup.enter="doTrace" />
        <button class="btn" @click="doTrace">追踪</button>
        <span style="flex:1"></span>
        <button class="btn" @click="openOrderEditor">+ 新建物流单</button>
        <button class="btn btn-outline" @click="openCarrierEditor">+ 承运商</button>
      </div>
      <div v-if="traceResult" class="trace-result">
        <div class="trace-head">
          <b>{{ traceResult.logistics_no }}</b>
          <span class="chip c-blue">{{ traceResult.status_name }}</span>
          <span v-if="traceResult.is_cold_chain" class="chip c-cyan">冷链</span>
          <span class="trace-meta">{{ traceResult.origin }} → {{ traceResult.destination }} · {{ traceResult.carrier_name || '未指定承运商' }} · {{ traceResult.product_name }}</span>
        </div>
        <div class="progress-outer"><div class="progress-inner" :style="{ width: traceResult.progress + '%' }"></div></div>
        <div class="timeline">
          <div v-for="n in traceResult.nodes" :key="n.id" class="tl-item" :class="{ current: n.status === 'current' }">
            <div class="tl-dot"></div>
            <div class="tl-body">
              <div class="tl-title">{{ n.node_name }} <span class="tl-time">{{ n.node_time }}</span></div>
              <div class="tl-desc">{{ n.location }} {{ n.operator ? '· ' + n.operator : '' }}
                <span v-if="n.temp" :style="{ color: n.is_abnormal ? '#f56c6c' : '#13c2c2' }"> · {{ n.temp }}℃</span>
              </div>
              <div class="tl-desc" v-if="n.remark">{{ n.remark }}</div>
            </div>
          </div>
        </div>
        <div v-if="traceResult.cold_chain_records && traceResult.cold_chain_records.length" class="cc-temps">
          <div class="cc-title">运输温度记录（最近 {{ traceResult.cold_chain_records.length }} 条）</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>时间</th><th>设备</th><th>温度</th><th>湿度</th><th>判定</th></tr></thead>
              <tbody>
                <tr v-for="t in traceResult.cold_chain_records" :key="t.id">
                  <td>{{ t.record_time }}</td><td>{{ t.device_name }}</td>
                  <td :style="{ color: t.is_abnormal ? '#f56c6c' : '#303133' }">{{ t.temp }}℃</td>
                  <td>{{ t.humid }}%</td>
                  <td>{{ t.is_abnormal ? '超标' : '正常' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 物流单列表 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <div class="card-title">物流单管理</div>
        <div>
          <select v-model="filterStatus" @change="load" style="margin-right:8px">
            <option value="">全部状态</option><option value="pending">待发货</option><option value="shipped">已发运</option>
            <option value="in_transit">运输中</option><option value="arrived">已到达</option>
            <option value="signed">已签收</option><option value="exception">异常</option>
          </select>
          <label class="chk"><input type="checkbox" v-model="onlyCold" @change="load" />只看冷链</label>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>单号</th><th>品名/批号</th><th>线路</th><th>承运商</th><th>当前节点</th><th>进度</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id">
              <td>{{ o.logistics_no }} <span v-if="o.is_cold_chain" class="chip c-cyan">冷链</span></td>
              <td>{{ o.product_name || '-' }}<br/><small style="color:#909399">{{ o.batch || '' }}</small></td>
              <td>{{ o.origin }} → {{ o.destination }}</td>
              <td>{{ o.carrier_name || '-' }}</td>
              <td>{{ o.current_node || '-' }}</td>
              <td>
                <div class="progress-outer sm"><div class="progress-inner" :style="{ width: o.progress + '%' }"></div></div>
              </td>
              <td><span class="chip" :class="statusClass(o.status)">{{ o.status_name }}</span></td>
              <td class="op-cell">
                <button class="btn btn-sm" @click="openNode(o)" v-if="!['signed'].includes(o.status)">更新节点</button>
                <button class="btn btn-sm btn-outline" @click="viewTrace(o)">轨迹</button>
                <button class="btn btn-sm btn-danger" @click="removeOrder(o)" v-if="o.status === 'pending'">删除</button>
              </td>
            </tr>
            <tr v-if="!orders.length"><td colspan="8" style="text-align:center;color:#999;padding:24px">暂无物流单</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新建物流单弹窗 -->
    <div class="modal-mask" v-if="showOrderEditor" @click.self="showOrderEditor = false">
      <div class="modal-box">
        <div class="modal-title">新建物流单</div>
        <div class="form-grid">
          <label>关联类型
            <select v-model="orderForm.related_type">
              <option value="procurement">采购到货</option><option value="outbound">销售出库</option><option value="other">其他</option>
            </select>
          </label>
          <label>关联单号<input v-model="orderForm.related_no" placeholder="采购单号/出库单号" /></label>
          <label>承运商
            <select v-model="orderForm.carrier_id">
              <option :value="0">（不指定）</option>
              <option v-for="c in carriers" :key="c.id" :value="c.id">{{ c.name }}{{ c.cold_chain_qualified ? '（冷链资质）' : '' }}</option>
            </select>
          </label>
          <label>运输方式
            <select v-model="orderForm.transport_mode">
              <option value="normal">常温车</option><option value="cold_chain">冷链车</option>
              <option value="air">航空</option><option value="railway">铁路</option><option value="express">快递</option>
            </select>
          </label>
          <label>发货地<input v-model="orderForm.origin" /></label>
          <label>目的地<input v-model="orderForm.destination" /></label>
          <label>品名<input v-model="orderForm.product_name" /></label>
          <label>批号<input v-model="orderForm.batch" /></label>
          <label>数量<input type="number" v-model.number="orderForm.quantity" /></label>
          <label>收货客户<input v-model="orderForm.customer_name" /></label>
          <label>司机/电话<input v-model="orderForm.driver_phone" placeholder="手机号" /></label>
          <label>车牌号<input v-model="orderForm.vehicle_no" /></label>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" @click="showOrderEditor = false">取消</button>
          <button class="btn" @click="saveOrder">创建</button>
        </div>
      </div>
    </div>

    <!-- 承运商弹窗 -->
    <div class="modal-mask" v-if="showCarrierEditor" @click.self="showCarrierEditor = false">
      <div class="modal-box" style="width:480px">
        <div class="modal-title">新增承运商</div>
        <div class="form-grid" style="grid-template-columns:1fr">
          <label>名称<input v-model="carrierForm.name" /></label>
          <label>联系电话<input v-model="carrierForm.phone" /></label>
          <label>道路运输经营许可证<input v-model="carrierForm.license_no" /></label>
          <label class="chk" style="flex-direction:row;align-items:center"><input type="checkbox" v-model="carrierForm.cold_chain_qualified" style="width:auto" />具备冷链运输资质</label>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" @click="showCarrierEditor = false">取消</button>
          <button class="btn" @click="saveCarrier">保存</button>
        </div>
      </div>
    </div>

    <!-- 节点更新弹窗 -->
    <div class="modal-mask" v-if="showNodeEditor" @click.self="showNodeEditor = false">
      <div class="modal-box" style="width:520px">
        <div class="modal-title">更新物流节点 — {{ nodeOrder.logistics_no }}</div>
        <div class="form-grid">
          <label>节点类型
            <select v-model="nodeForm.node_code">
              <option value="loaded">装车</option><option value="shipped">发运</option>
              <option value="transit">中转</option><option value="arrived">到达</option>
              <option value="delivering">派送</option><option value="signed">签收</option>
              <option value="exception">异常</option>
            </select>
          </label>
          <label>当前位置<input v-model="nodeForm.location" /></label>
          <template v-if="nodeOrder.is_cold_chain">
            <label>随车温度(℃)<input type="number" step="0.1" v-model.number="nodeForm.temp" /></label>
            <label>湿度(%)<input type="number" step="0.1" v-model.number="nodeForm.humid" /></label>
          </template>
          <label v-if="nodeForm.node_code === 'signed'">签收人<input v-model="nodeForm.signed_by" /></label>
          <label>备注<input v-model="nodeForm.remark" /></label>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" @click="showNodeEditor = false">取消</button>
          <button class="btn" @click="saveNode">记录节点</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { logistics } from '../api'

const summary = ref({})
const orders = ref([])
const carriers = ref([])
const traceNo = ref('')
const traceResult = ref(null)
const filterStatus = ref('')
const onlyCold = ref(false)
const showOrderEditor = ref(false)
const showCarrierEditor = ref(false)
const showNodeEditor = ref(false)
const orderForm = ref({})
const carrierForm = ref({})
const nodeForm = ref({})
const nodeOrder = ref({})

function statusClass(s) {
  return { pending: 'c-gray', shipped: 'c-blue', in_transit: 'c-blue', arrived: 'c-orange', signed: 'c-green', exception: 'c-red' }[s] || 'c-gray'
}

async function load() {
  try {
    const params = {}
    if (filterStatus.value) params.status = filterStatus.value
    if (onlyCold.value) params.is_cold_chain = '1'
    orders.value = (await logistics.listOrders(params)).list || []
  } catch { orders.value = [] }
}
async function loadDashboard() {
  try { summary.value = (await logistics.dashboard()).summary || {} } catch { /* 忽略 */ }
}
async function loadCarriers() {
  try { carriers.value = (await logistics.listCarriers()).list || [] } catch { carriers.value = [] }
}

async function doTrace() {
  if (!traceNo.value.trim()) return
  try {
    traceResult.value = await logistics.trace(traceNo.value.trim())
  } catch (e) {
    traceResult.value = null
    window.alert(e.message)
  }
}
function viewTrace(o) {
  traceNo.value = o.logistics_no
  doTrace()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openOrderEditor() {
  orderForm.value = { related_type: 'outbound', related_no: '', carrier_id: 0, transport_mode: 'normal', origin: '', destination: '', product_name: '', batch: '', quantity: 0, customer_name: '', driver_phone: '', vehicle_no: '' }
  showOrderEditor.value = true
}
async function saveOrder() {
  try {
    const d = await logistics.createOrder(orderForm.value)
    window.alert(`物流单 ${d.logistics_no} 创建成功`)
    showOrderEditor.value = false
    await load(); await loadDashboard()
  } catch (e) { window.alert(e.message) }
}

function openCarrierEditor() {
  carrierForm.value = { name: '', phone: '', license_no: '', cold_chain_qualified: false }
  showCarrierEditor.value = true
}
async function saveCarrier() {
  if (!carrierForm.value.name) return window.alert('承运商名称必填')
  try {
    await logistics.createCarrier(carrierForm.value)
    showCarrierEditor.value = false
    await loadCarriers()
  } catch (e) { window.alert(e.message) }
}

function openNode(o) {
  nodeOrder.value = o
  nodeForm.value = { node_code: 'shipped', location: '', temp: null, humid: null, signed_by: '', remark: '' }
  showNodeEditor.value = true
}
async function saveNode() {
  try {
    const d = await logistics.addNode(nodeOrder.value.id, nodeForm.value)
    window.alert(d && d.message ? d.message : '节点已记录')
    showNodeEditor.value = false
    await load(); await loadDashboard()
    if (traceResult.value && traceResult.value.id === nodeOrder.value.id) doTrace()
  } catch (e) { window.alert(e.message) }
}
async function removeOrder(o) {
  if (!window.confirm(`确认删除物流单 ${o.logistics_no}？`)) return
  try { await logistics.removeOrder(o.id); await load(); await loadDashboard() } catch (e) { window.alert(e.message) }
}

onMounted(() => { load(); loadDashboard(); loadCarriers() })
</script>

<style scoped>
.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.stat-card { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 14px; }
.stat-label { font-size: 13px; color: #909399; }
.stat-value { font-size: 24px; font-weight: 700; color: #303133; margin-top: 4px; }
.card { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 12px; }
.trace-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
.trace-bar input { flex: 1; max-width: 360px; padding: 8px 10px; border: 1px solid #dcdfe6; border-radius: 4px; }
.trace-result { border-top: 1px dashed #ebeef5; padding-top: 12px; }
.trace-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.trace-meta { color: #909399; font-size: 13px; }
.progress-outer { height: 8px; background: #f0f2f5; border-radius: 4px; overflow: hidden; margin-bottom: 14px; }
.progress-outer.sm { width: 90px; height: 6px; margin: 0; }
.progress-inner { height: 100%; background: linear-gradient(90deg, #409eff, #67c23a); border-radius: 4px; transition: width .3s; }
.timeline { padding-left: 6px; }
.tl-item { display: flex; gap: 12px; padding-bottom: 16px; position: relative; }
.tl-item::before { content: ''; position: absolute; left: 5px; top: 14px; bottom: -2px; width: 2px; background: #ebeef5; }
.tl-item:last-child::before { display: none; }
.tl-dot { width: 12px; height: 12px; border-radius: 50%; background: #c0c4cc; margin-top: 4px; flex-shrink: 0; z-index: 1; }
.tl-item.current .tl-dot { background: #409eff; box-shadow: 0 0 0 3px #ecf5ff; }
.tl-title { font-weight: 600; font-size: 14px; }
.tl-time { font-weight: 400; font-size: 12px; color: #909399; margin-left: 8px; }
.tl-desc { font-size: 13px; color: #606266; margin-top: 2px; }
.cc-temps { margin-top: 8px; border-top: 1px dashed #ebeef5; padding-top: 10px; }
.cc-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #13c2c2; }
.chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.c-green { background: #f0f9eb; color: #67c23a; }
.c-red { background: #fef0f0; color: #f56c6c; }
.c-orange { background: #fdf6ec; color: #e6a23c; }
.c-gray { background: #f4f4f5; color: #909399; }
.c-blue { background: #ecf5ff; color: #409eff; }
.c-cyan { background: #e6fffb; color: #13c2c2; }
.chk { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #606266; }
.op-cell button { margin: 2px; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 300; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #fff; border-radius: 8px; padding: 20px; width: 680px; max-width: 94vw; max-height: 86vh; overflow-y: auto; }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-grid label { display: flex; flex-direction: column; font-size: 13px; color: #606266; gap: 4px; }
.form-grid input, .form-grid select { padding: 6px 8px; border: 1px solid #dcdfe6; border-radius: 4px; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.btn-danger { color: #f56c6c; border-color: #f56c6c; background: #fff; }
</style>
