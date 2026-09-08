<template>
  <div>
    <!-- 实时看板 -->
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">设备总数</div><div class="stat-value">{{ summary.device_total || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">在线设备</div><div class="stat-value" style="color:#67c23a">{{ summary.online || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">离线设备</div><div class="stat-value" style="color:#f56c6c">{{ summary.offline || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">今日监测</div><div class="stat-value">{{ summary.today_records || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">今日报警</div><div class="stat-value" style="color:#e6a23c">{{ summary.today_alarms || 0 }}</div></div>
      <div class="stat-card"><div class="stat-label">待处理报警</div><div class="stat-value" style="color:#f56c6c">{{ summary.pending_alarms || 0 }}</div></div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <span v-for="t in tabs" :key="t.id" class="tab-item" :class="{ active: tab === t.id }" @click="tab = t.id">{{ t.label }}</span>
      <span style="flex:1"></span>
      <button class="btn btn-sm" v-if="tab === 'devices'" @click="openDeviceEditor(null)">+ 新增设备</button>
      <button class="btn btn-sm" v-if="tab === 'records'" @click="openRecordEditor">+ 手动录入</button>
      <button class="btn btn-sm btn-outline" v-if="tab === 'alarms'" @click="doScanOffline">扫描离线</button>
      <button class="btn btn-sm" v-if="tab === 'ledgers'" @click="showLedgerGen = true">+ 生成台账</button>
    </div>

    <!-- 设备 -->
    <div class="card" v-show="tab === 'devices'">
      <div class="table-wrap">
        <table>
          <thead><tr><th>编号</th><th>名称</th><th>类型</th><th>节点</th><th>温度阈值</th><th>当前温度</th><th>状态</th><th>IoT密钥</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="d in devices" :key="d.id">
              <td>{{ d.device_code }}</td><td>{{ d.device_name }}</td><td>{{ d.device_type }}</td>
              <td>{{ d.node_type_name }}</td>
              <td>{{ d.temp_min }}~{{ d.temp_max }}℃</td>
              <td :style="{ color: d.latest_abnormal ? '#f56c6c' : '#303133' }">
                {{ d.latest_temp !== null && d.latest_temp !== undefined ? d.latest_temp + '℃' : '-' }}
              </td>
              <td>
                <span class="chip" :class="d.is_offline ? 'c-red' : (d.status === 'normal' ? 'c-green' : 'c-gray')">
                  {{ d.is_offline ? '离线' : d.status_name }}
                </span>
              </td>
              <td><code class="apikey">{{ (d.api_key || '').slice(0, 12) }}…</code></td>
              <td>
                <button class="btn btn-sm" @click="openDeviceEditor(d)">编辑</button>
                <button class="btn btn-sm btn-danger" @click="removeDevice(d)">删除</button>
              </td>
            </tr>
            <tr v-if="!devices.length"><td colspan="9" style="text-align:center;color:#999;padding:24px">暂无设备，点击「新增设备」登记冷藏车/冷库/记录仪</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 监测记录 -->
    <div class="card" v-show="tab === 'records'">
      <div class="filter-bar">
        <input v-model="recFilter.batch" placeholder="批号" @keyup.enter="loadRecords" />
        <input v-model="recFilter.udi" placeholder="UDI" @keyup.enter="loadRecords" />
        <label class="chk"><input type="checkbox" v-model="recFilter.abnormal" @change="loadRecords" />只看超标</label>
        <button class="btn btn-sm" @click="loadRecords">查询</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>时间</th><th>设备</th><th>节点</th><th>温度</th><th>湿度</th><th>批号</th><th>品名</th><th>来源</th><th>判定</th></tr></thead>
          <tbody>
            <tr v-for="r in records" :key="r.id" :class="{ 'row-abnormal': r.is_abnormal }">
              <td>{{ r.record_time }}</td><td>{{ r.device_name }}</td><td>{{ nodeName(r.node_type) }}</td>
              <td>{{ r.temp }}℃</td><td>{{ r.humid }}%</td><td>{{ r.batch || '-' }}</td>
              <td>{{ r.product_name || '-' }}</td><td>{{ { manual: '手动', iot: 'IoT', import: '导入' }[r.source] || r.source }}</td>
              <td><span class="chip" :class="r.is_abnormal ? 'c-red' : 'c-green'">{{ r.is_abnormal ? exceedName(r.exceed_type) : '正常' }}</span></td>
            </tr>
            <tr v-if="!records.length"><td colspan="9" style="text-align:center;color:#999;padding:24px">暂无监测记录</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 报警 -->
    <div class="card" v-show="tab === 'alarms'">
      <div class="filter-bar">
        <select v-model="alarmFilter" @change="loadAlarms">
          <option value="">全部状态</option><option value="pending">待处理</option>
          <option value="processing">处理中</option><option value="resolved">已解决</option><option value="ignored">已忽略</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>报警编号</th><th>设备</th><th>类型</th><th>级别</th><th>温度/阈值</th><th>触发时间</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="a in alarms" :key="a.id">
              <td>{{ a.alarm_no }}</td><td>{{ a.device_name }}</td><td>{{ a.alarm_type_name }}</td>
              <td><span class="chip" :class="a.alarm_level === 'critical' ? 'c-red' : 'c-orange'">{{ a.alarm_level_name }}</span></td>
              <td>{{ a.temp }}℃ / {{ a.temp_min }}~{{ a.temp_max }}℃</td>
              <td>{{ a.triggered_at }}</td>
              <td><span class="chip" :class="{ 'c-red': a.status === 'pending', 'c-orange': a.status === 'processing', 'c-green': a.status === 'resolved', 'c-gray': a.status === 'ignored' }">{{ a.status_name }}</span></td>
              <td><button class="btn btn-sm" v-if="['pending','processing'].includes(a.status)" @click="openHandle(a)">处理</button></td>
            </tr>
            <tr v-if="!alarms.length"><td colspan="8" style="text-align:center;color:#999;padding:24px">暂无报警</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 台账 -->
    <div class="card" v-show="tab === 'ledgers'">
      <div class="table-wrap">
        <table>
          <thead><tr><th>台账编号</th><th>品名</th><th>批号</th><th>覆盖节点</th><th>温度范围</th><th>记录/报警</th><th>结论</th><th>审核</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="l in ledgers" :key="l.id">
              <td>{{ l.ledger_no }}</td><td>{{ l.product_name || '-' }}</td><td>{{ l.batch || '-' }}</td>
              <td>{{ nodeList(l.covered_nodes) }}</td>
              <td>{{ l.temp_min }}~{{ l.temp_max }}℃</td>
              <td>{{ l.record_count }}条 / {{ l.alarm_count }}次</td>
              <td><span class="chip" :class="l.is_qualified ? 'c-green' : 'c-red'">{{ l.is_qualified_name }}</span></td>
              <td>{{ l.verified_by || '未审核' }}</td>
              <td><button class="btn btn-sm" v-if="!l.verified_by" @click="verifyLedger(l)">审核</button></td>
            </tr>
            <tr v-if="!ledgers.length"><td colspan="9" style="text-align:center;color:#999;padding:24px">暂无台账，点击「生成台账」按批次归集全链条记录</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 设备编辑弹窗 -->
    <div class="modal-mask" v-if="showDeviceEditor" @click.self="showDeviceEditor = false">
      <div class="modal-box">
        <div class="modal-title">{{ devForm.id ? '编辑设备' : '新增设备' }}</div>
        <div class="form-grid">
          <label>设备名称<input v-model="devForm.device_name" placeholder="如 1号冷藏车" /></label>
          <label>设备类型
            <select v-model="devForm.device_type">
              <option>冷藏车</option><option>冷库</option><option>冷藏柜</option>
              <option>冷藏箱</option><option>保温箱</option><option>温湿度记录仪</option><option>车载终端</option>
            </select>
          </label>
          <label>适用节点
            <select v-model="devForm.node_type">
              <option value="factory_warehouse">生产厂家库房</option><option value="transport">干线运输途中</option>
              <option value="own_warehouse">本公司库房</option><option value="customer">客户交付</option>
            </select>
          </label>
          <label>所在位置<input v-model="devForm.location" /></label>
          <label>温度下限(℃)<input type="number" v-model.number="devForm.temp_min" /></label>
          <label>温度上限(℃)<input type="number" v-model.number="devForm.temp_max" /></label>
          <label>车牌号（运输节点）<input v-model="devForm.vehicle_no" /></label>
          <label>上报间隔(分钟)<input type="number" v-model.number="devForm.report_interval" /></label>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" @click="showDeviceEditor = false">取消</button>
          <button class="btn" @click="saveDevice">保存</button>
        </div>
      </div>
    </div>

    <!-- 手动录入弹窗 -->
    <div class="modal-mask" v-if="showRecordEditor" @click.self="showRecordEditor = false">
      <div class="modal-box" style="width:520px">
        <div class="modal-title">手动录入监测记录</div>
        <div class="form-grid">
          <label>设备
            <select v-model="recForm.device_id">
              <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.device_name }}</option>
            </select>
          </label>
          <label>温度(℃)<input type="number" step="0.1" v-model.number="recForm.temp" /></label>
          <label>湿度(%)<input type="number" step="0.1" v-model.number="recForm.humid" /></label>
          <label>批号<input v-model="recForm.batch" /></label>
          <label>品名<input v-model="recForm.product_name" /></label>
          <label>关联物流单ID<input type="number" v-model.number="recForm.logistics_id" /></label>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" @click="showRecordEditor = false">取消</button>
          <button class="btn" @click="saveRecord">保存</button>
        </div>
      </div>
    </div>

    <!-- 报警处理弹窗 -->
    <div class="modal-mask" v-if="showHandle" @click.self="showHandle = false">
      <div class="modal-box" style="width:480px">
        <div class="modal-title">处理报警 {{ handling.alarm_no }}</div>
        <div class="form-grid" style="grid-template-columns:1fr">
          <label>处理结果
            <select v-model="handleForm.status">
              <option value="processing">处理中</option><option value="resolved">已解决</option><option value="ignored">已忽略</option>
            </select>
          </label>
          <label>处理措施<textarea v-model="handleForm.handle_action" rows="2"></textarea></label>
          <label>处理结论<textarea v-model="handleForm.handle_result" rows="2"></textarea></label>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" @click="showHandle = false">取消</button>
          <button class="btn" @click="saveHandle">提交</button>
        </div>
      </div>
    </div>

    <!-- 生成台账弹窗 -->
    <div class="modal-mask" v-if="showLedgerGen" @click.self="showLedgerGen = false">
      <div class="modal-box" style="width:480px">
        <div class="modal-title">生成冷链台账（按批次/UDI/物流单归集全链条）</div>
        <div class="form-grid" style="grid-template-columns:1fr">
          <label>批号<input v-model="ledgerForm.batch" placeholder="三选一即可" /></label>
          <label>UDI<input v-model="ledgerForm.udi" /></label>
          <label>物流单ID<input type="number" v-model.number="ledgerForm.logistics_id" /></label>
          <label>品名（可选）<input v-model="ledgerForm.product_name" /></label>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" @click="showLedgerGen = false">取消</button>
          <button class="btn" @click="genLedger">生成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { coldChain } from '../api'

const tabs = [
  { id: 'devices', label: '冷链设备' },
  { id: 'records', label: '监测记录' },
  { id: 'alarms', label: '报警处理' },
  { id: 'ledgers', label: '冷链台账' },
]
const tab = ref('devices')
const summary = ref({})
const devices = ref([])
const records = ref([])
const alarms = ref([])
const ledgers = ref([])
const recFilter = ref({ batch: '', udi: '', abnormal: false })
const alarmFilter = ref('')
const showDeviceEditor = ref(false)
const showRecordEditor = ref(false)
const showHandle = ref(false)
const showLedgerGen = ref(false)
const devForm = ref({})
const recForm = ref({})
const handleForm = ref({ status: 'resolved', handle_action: '', handle_result: '' })
const handling = ref({})
const ledgerForm = ref({ batch: '', udi: '', logistics_id: 0, product_name: '' })
let timer = null

const NODE_NAME = { factory_warehouse: '厂家库房', transport: '运输途中', own_warehouse: '本公司库房', customer: '客户交付' }
const nodeName = (t) => NODE_NAME[t] || t
const exceedName = (t) => ({ temp_high: '温度超上限', temp_low: '温度低于下限', humid_high: '湿度超上限', humid_low: '湿度低于下限' }[t] || '超标')
function nodeList(json) {
  try { return (JSON.parse(json || '[]')).map(nodeName).join('→') } catch { return '-' }
}

async function loadDashboard() {
  try {
    const d = await coldChain.dashboard()
    summary.value = d.summary || {}
    devices.value = d.devices || []
  } catch { /* 忽略 */ }
}
async function loadRecords() {
  try {
    const params = {}
    if (recFilter.value.batch) params.batch = recFilter.value.batch
    if (recFilter.value.udi) params.udi = recFilter.value.udi
    if (recFilter.value.abnormal) params.abnormal = '1'
    records.value = (await coldChain.listRecords(params)).list || []
  } catch { records.value = [] }
}
async function loadAlarms() {
  try {
    alarms.value = (await coldChain.listAlarms(alarmFilter.value ? { status: alarmFilter.value } : {})).list || []
  } catch { alarms.value = [] }
}
async function loadLedgers() {
  try { ledgers.value = (await coldChain.listLedgers()).list || [] } catch { ledgers.value = [] }
}

function openDeviceEditor(d) {
  devForm.value = d ? { ...d } : { device_name: '', device_type: '冷藏车', node_type: 'own_warehouse', temp_min: 2, temp_max: 8, location: '', vehicle_no: '', report_interval: 30 }
  showDeviceEditor.value = true
}
async function saveDevice() {
  if (!devForm.value.device_name) return window.alert('设备名称必填')
  try {
    if (devForm.value.id) await coldChain.updateDevice(devForm.value.id, devForm.value)
    else {
      const d = await coldChain.createDevice(devForm.value)
      window.alert('设备创建成功，IoT 密钥已生成（设备列表可查看）')
    }
    showDeviceEditor.value = false
    await loadDashboard()
  } catch (e) { window.alert(e.message) }
}
async function removeDevice(d) {
  if (!window.confirm(`确认删除设备「${d.device_name}」？`)) return
  try { await coldChain.removeDevice(d.id); await loadDashboard() } catch (e) { window.alert(e.message) }
}

function openRecordEditor() {
  recForm.value = { device_id: devices.value[0]?.id || 0, temp: null, humid: null, batch: '', product_name: '', logistics_id: 0 }
  showRecordEditor.value = true
}
async function saveRecord() {
  if (recForm.value.temp === null || recForm.value.temp === undefined) return window.alert('温度必填')
  try {
    const d = await coldChain.createRecord(recForm.value)
    window.alert(d.is_abnormal ? '记录已保存：检测到超标，已自动生成报警' : '记录已保存')
    showRecordEditor.value = false
    await loadRecords(); await loadAlarms(); await loadDashboard()
  } catch (e) { window.alert(e.message) }
}

function openHandle(a) {
  handling.value = a
  handleForm.value = { status: 'resolved', handle_action: '', handle_result: '' }
  showHandle.value = true
}
async function saveHandle() {
  try {
    await coldChain.handleAlarm(handling.value.id, handleForm.value)
    showHandle.value = false
    await loadAlarms(); await loadDashboard()
  } catch (e) { window.alert(e.message) }
}
async function doScanOffline() {
  try {
    await coldChain.scanOffline()
    await loadAlarms(); await loadDashboard()
  } catch (e) { window.alert(e.message) }
}

async function genLedger() {
  const f = ledgerForm.value
  if (!f.batch && !f.udi && !f.logistics_id) return window.alert('批号/UDI/物流单ID 至少填一项')
  try {
    const d = await coldChain.generateLedger(f)
    window.alert(`台账生成成功（${d.is_qualified ? '合格' : '不合格'}）`)
    showLedgerGen.value = false
    await loadLedgers()
  } catch (e) { window.alert(e.message) }
}
async function verifyLedger(l) {
  try { await coldChain.verifyLedger(l.id); await loadLedgers() } catch (e) { window.alert(e.message) }
}

onMounted(() => {
  loadDashboard(); loadRecords(); loadAlarms(); loadLedgers()
  timer = setInterval(loadDashboard, 30000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.stat-card { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 14px; }
.stat-label { font-size: 13px; color: #909399; }
.stat-value { font-size: 24px; font-weight: 700; color: #303133; margin-top: 4px; }
.tab-bar { display: flex; gap: 4px; align-items: center; margin: 16px 0 10px; border-bottom: 1px solid #ebeef5; padding-bottom: 8px; }
.tab-item { padding: 6px 14px; cursor: pointer; border-radius: 6px; font-size: 14px; color: #606266; }
.tab-item.active { background: #ecf5ff; color: #409eff; font-weight: 600; }
.card { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 12px; }
.filter-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.filter-bar input, .filter-bar select { padding: 6px 8px; border: 1px solid #dcdfe6; border-radius: 4px; }
.chk { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #606266; }
.chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.c-green { background: #f0f9eb; color: #67c23a; }
.c-red { background: #fef0f0; color: #f56c6c; }
.c-orange { background: #fdf6ec; color: #e6a23c; }
.c-gray { background: #f4f4f5; color: #909399; }
.row-abnormal { background: #fff8f8; }
.apikey { font-size: 11px; color: #909399; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 300; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #fff; border-radius: 8px; padding: 20px; width: 680px; max-width: 94vw; max-height: 86vh; overflow-y: auto; }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-grid label { display: flex; flex-direction: column; font-size: 13px; color: #606266; gap: 4px; }
.form-grid input, .form-grid select, .form-grid textarea { padding: 6px 8px; border: 1px solid #dcdfe6; border-radius: 4px; font-family: inherit; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.btn-danger { color: #f56c6c; border-color: #f56c6c; background: #fff; }
</style>
