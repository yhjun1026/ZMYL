<template>
  <div v-if="title">
    <div class="card">
      <div class="card-header">
        <div class="card-title">{{ title }}</div>
        <div class="toolbar" style="margin-bottom:0">
          <input class="search-input" v-model="keyword" :placeholder="'搜索' + title + '...'" @keyup.enter="reload">
          <button class="btn btn-primary" @click="reload">🔍 查询</button>
          <div class="spacer"></div>
          <button v-if="resource === 'outbound_record'" class="btn btn-outline" @click="showPrintSettings">⚙ 打印设置</button>
          <button class="btn btn-primary" v-if="resource" @click="openCreate">＋ 新增</button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
              <th v-if="wf.mode" style="width:110px">审批状态</th>
              <th v-if="resource" style="width:180px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td v-for="col in columns" :key="col.key">
                <span v-if="col.tag" class="tag" :class="tagClass(row[col.key])">{{ row[col.key] ?? '-' }}</span>
                <template v-else>{{ fmt(row[col.key]) }}</template>
              </td>
              <!-- 审批状态列 -->
              <td v-if="wf.mode">
                <span class="tag" :class="tagClass(row.workflow_status || row.status)">{{ row.workflow_status || row.status || '-' }}</span>
                <div v-if="row.reviewed_by" style="font-size:10px;color:#666;margin-top:2px">初审:{{ row.reviewed_by }} {{ fmt(row.reviewed_at) }}</div>
                <div v-if="row.approved_by" style="font-size:10px;color:#52c41a">终审:{{ row.approved_by }} {{ fmt(row.approved_at) }}</div>
                <div v-if="wf.mode === 'proc' && row.purchaser_accepted" style="font-size:10px;color:#666">验收:{{ row.purchaser_accepted }}</div>
                <div v-if="wf.mode === 'proc' && row.quality_reviewed" style="font-size:10px;color:#666">质管:{{ row.quality_reviewed }}</div>
                <div v-if="wf.mode === 'proc' && row.warehouse_confirmed" style="font-size:10px;color:#666">库管:{{ row.warehouse_confirmed }}</div>
                <div v-if="wf.mode === 'proc' && row.quality_approved" style="font-size:10px;color:#52c41a">✓批准:{{ row.quality_approved }}</div>
              </td>
              <!-- 操作列 -->
              <td v-if="resource" class="action-cell">
                <button class="btn btn-sm btn-outline" @click="openEdit(row)">编辑</button>
                <!-- 资料上传下载（首营/供货/验收/采购单） -->
                <button v-if="DOC_RESOURCES.includes(resource)" class="btn btn-sm btn-outline" @click="openDocs(row)">📎 资料</button>
                <!-- 出库单打印 -->
                <button v-if="resource === 'outbound_record'" class="btn btn-sm btn-outline" @click="printOutbound(row)">🖨 打印</button>
                <!-- 两级审批操作 -->
                <template v-if="wf.mode === 'two' && row.workflow_status === '待审核'">
                  <button class="btn btn-sm btn-teal" @click="doReview(row, 'approve')">通过</button>
                  <button class="btn btn-sm btn-danger" @click="doReview(row, 'reject')">驳回</button>
                </template>
                <template v-else-if="wf.mode === 'two' && row.workflow_status === '已审核'">
                  <button class="btn btn-sm btn-teal" @click="doApprove(row, 'approve')">批准</button>
                  <button class="btn btn-sm btn-danger" @click="doApprove(row, 'reject')">驳回</button>
                </template>
                <!-- 采购计划单级审批 -->
                <template v-else-if="wf.mode === 'plan' && row.workflow_status === '待审批'">
                  <button class="btn btn-sm btn-teal" @click="doPlanReview(row, 'approve')">批准</button>
                  <button class="btn btn-sm btn-danger" @click="doPlanReview(row, 'reject')">驳回</button>
                </template>
                <template v-else-if="wf.mode === 'plan' && row.workflow_status === '已批准'">
                  <button class="btn btn-sm btn-primary" @click="doConvert(row)">转采购单</button>
                </template>
                <!-- 采购五步流 -->
                <template v-else-if="wf.mode === 'proc'">
                  <button v-if="row.workflow_status === '待验收'" class="btn btn-sm btn-teal" @click="doProc(row, 'purchaser-accept')">验收</button>
                  <button v-else-if="row.workflow_status === '待质管审核'" class="btn btn-sm btn-teal" @click="doProc(row, 'quality-review')">质管审核</button>
                  <button v-else-if="row.workflow_status === '待库管确认'" class="btn btn-sm btn-teal" @click="doProc(row, 'warehouse-confirm')">库管确认</button>
                  <button v-else-if="row.workflow_status === '待负责人批准'" class="btn btn-sm btn-teal" @click="doProc(row, 'quality-approve')">批准入库</button>
                </template>
                <!-- 销售出库六级流（P3） -->
                <template v-else-if="wf.mode === 'outbound' && /^待/.test(row.status || '')">
                  <button class="btn btn-sm btn-teal" @click="doOutbound(row, 'approve')">通过</button>
                  <button class="btn btn-sm btn-danger" @click="doOutbound(row, 'reject')">驳回</button>
                </template>
                <!-- 产品验收五步流（P3） -->
                <template v-else-if="wf.mode === 'pa'">
                  <button v-if="row.workflow_status === '待验收'" class="btn btn-sm btn-teal" @click="doPa(row, 'appearance')">外观检查</button>
                  <button v-else-if="row.workflow_status === '外观检查完成'" class="btn btn-sm btn-teal" @click="doPa(row, 'quantity')">数量核对</button>
                  <button v-else-if="row.workflow_status === '数量核对完成'" class="btn btn-sm btn-teal" @click="doPa(row, 'quality')">质量检验</button>
                  <button v-else-if="row.workflow_status === '质量检验完成'" class="btn btn-sm btn-teal" @click="doPaFinal(row)">综合判定</button>
                  <button v-else-if="row.workflow_status === '不合格待处理'" class="btn btn-sm btn-warn" @click="doPaReset(row)">重新验收</button>
                </template>
                <button class="btn btn-sm btn-danger" @click="doDelete(row)">删除</button>
              </td>
            </tr>
            <tr v-if="!rows.length && !loading">
              <td :colspan="columns.length + (wf.mode ? 1 : 0) + 1">
                <div class="empty-state">
                  <div class="empty-icon">📭</div>
                  <div class="empty-text">暂无数据</div>
                  <div class="empty-hint">点击右上角"新增"添加记录</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" v-if="total > size">
        <button class="page-btn" :disabled="page <= 1" @click="page--; reload()">‹</button>
        <button class="page-btn" :class="{active: page === p}" v-for="p in pages" :key="p" @click="page = p; reload()">{{ p }}</button>
        <button class="page-btn" :disabled="page >= maxPage" @click="page++; reload()">›</button>
        <span class="page-info">共 {{ total }} 条</span>
      </div>
    </div>

    <!-- 新增/编辑弹窗（原版 .modal 一比一） -->
    <div class="modal-overlay" :class="{ show: showModal }">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">{{ editId ? '编辑' + title : '新增' + title }}</div>
          <button class="modal-close" @click="showModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group" v-for="col in editableColumns" :key="col.key">
              <label>{{ col.label }}<span v-if="col.required" style="color:var(--danger)"> *</span></label>
              <input v-if="col.type !== 'date' && col.type !== 'number'" v-model="form[col.key]" :type="col.type || 'text'">
              <input v-else-if="col.type === 'date'" v-model="form[col.key]" type="date">
              <input v-else v-model.number="form[col.key]" type="number">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" style="background:#f0f2f5" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 出库单专用联动表单 -->
    <OutboundModal v-if="showOutbound" :edit-row="outboundEditRow" @close="showOutbound = false" @saved="reload" />

    <!-- 资料上传下载 -->
    <DocModal v-if="docTarget" :biz-type="docTarget.bizType" :biz-id="docTarget.bizId" :title="docTarget.title" @close="docTarget = null" />
  </div>
  <div v-else class="loading-text"><div class="loading-spinner"></div><div class="loading-label">模块开发中</div></div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { menuItems, moduleResource } from '../router'
import { crud, workflow } from '../api'
import OutboundModal from '../components/OutboundModal.vue'
import DocModal from '../components/DocModal.vue'
import { fieldLabel } from '../utils/fieldLabels'

const route = useRoute()
const title = ref('')
const resource = ref('')
const columns = ref([])
const rows = ref([])
const total = ref(0)
const page = ref(1)
const size = 15
const keyword = ref('')
const loading = ref(false)
const showModal = ref(false)
const form = ref({})
const editId = ref(null)
const saving = ref(false)
const wf = ref({ mode: '' })
// 出库单专用表单 / 资料弹窗
const showOutbound = ref(false)
const outboundEditRow = ref(null)
const docTarget = ref(null)
// 支持资料上传下载的业务模块（首营/供货/验收/采购单）
const DOC_RESOURCES = ['first_factory_audit', 'first_product_audit', 'supplier', 'product_acceptance', 'proc_equipment', 'proc_consumable']

// 工作流模式配置（与后端 config/modules.js WORKFLOW 对齐）
const WF_TWO = ['supplier', 'customer_archive', 'personnel', 'health_record',
                'training_plan', 'first_factory_audit', 'first_product_audit',
                'system_profile']
const WF_PLAN = ['purchase_plan']
const WF_PROC = ['proc_equipment', 'proc_consumable']
const WF_OUTBOUND = ['outbound_record']       // 销售出库六级流（P3）
const WF_PA = ['product_acceptance']          // 产品验收五步流（P3）

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / size)))
const pages = computed(() => {
  const arr = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(maxPage.value, start + 4)
  for (let i = start; i <= end; i++) arr.push(i)
  return arr
})
const editableColumns = computed(() => {
  let cols = columns.value.filter(c => !c.readonly)
  // 审批字段只读
  cols = cols.filter(c => !/workflow|review|approve|audit_|purchaser_|quality_|warehouse_/.test(c.key))
  return cols.slice(0, 10)
})

function tagClass(v) {
  const s = String(v || '')
  if (/正常|在用|完成|通过|已入库|已批准|合格|生效|已审核/.test(s)) return 'tag-success'
  if (/待|审批中|进行|草稿/.test(s)) return 'tag-warning'
  if (/过期|报废|不合格|驳回|撤销|停用/.test(s)) return 'tag-danger'
  return 'tag-info'
}
function fmt(v) {
  if (v === null || v === undefined || v === '') return '-'
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.replace('T', ' ').slice(0, 16)
  return v
}

async function reload() {
  if (!resource.value) return
  loading.value = true
  try {
    const d = await crud.list(resource.value, { page: page.value, size, keyword: keyword.value || undefined })
    rows.value = d.records || d.items || []
    total.value = d.total || 0
  } catch (e) {
    rows.value = []
    window.alert(e.message)
  } finally { loading.value = false }
}

function deriveColumns(items) {
  if (!items.length) return []
  const skip = ['deleted', 'created_by', 'updated_by', 'password', 'password_hash']
  const keys = Object.keys(items[0]).filter(k => !skip.includes(k))
  // 列名/表单标签一律用原版中文（字典未命中回退原字段名）
  return keys.slice(0, 9).map(k => ({
    key: k,
    label: fieldLabel(k),
    tag: /status|state|workflow/.test(k),
    type: /date|time|expiry|valid/.test(k) ? 'date' : /qty|count|amount|price|num/.test(k) ? 'number' : 'text',
  }))
}

function openCreate() {
  if (resource.value === 'outbound_record') { outboundEditRow.value = null; showOutbound.value = true; return }
  editId.value = null
  form.value = {}
  showModal.value = true
}
function openEdit(row) {
  if (resource.value === 'outbound_record') { outboundEditRow.value = row; showOutbound.value = true; return }
  editId.value = row.id
  form.value = { ...row }
  showModal.value = true
}
function openDocs(row) {
  docTarget.value = { bizType: resource.value, bizId: row.id, title: (row.order_no || row.name || row.product_name || ('#' + row.id)) + ' · ' + title.value }
}

// ===== 出库单打印（原版打印系统移植：设置存 localStorage，iframe 打印） =====
const PRINT_CFG_KEY = 'med_print_config'
function getPrintConfig() {
  try { return Object.assign({
    companyName: '医疗器械有限公司', companyAddr: '北京市朝阳区科技园路88号', companyPhone: '010-88888000',
    style: 'classic', paperSize: 'A4', fontSize: '13px', showGSPNote: true,
  }, JSON.parse(localStorage.getItem(PRINT_CFG_KEY) || '{}')) } catch { return {
    companyName: '医疗器械有限公司', companyAddr: '北京市朝阳区科技园路88号', companyPhone: '010-88888000',
    style: 'classic', paperSize: 'A4', fontSize: '13px', showGSPNote: true,
  } }
}
function showPrintSettings() {
  const cfg = getPrintConfig()
  const html = `
    <div style="padding:16px 20px">
      <div class="form-row"><div class="form-group"><label>公司名称</label><input id="ps_company" value="${cfg.companyName}"></div>
      <div class="form-group"><label>联系电话</label><input id="ps_phone" value="${cfg.companyPhone}"></div></div>
      <div class="form-row"><div class="form-group"><label>公司地址</label><input id="ps_addr" value="${cfg.companyAddr}"></div>
      <div class="form-group"><label>打印样式</label><select id="ps_style" style="width:100%;padding:9px;border:1px solid #e4e8ee;border-radius:8px">
        <option value="classic"${cfg.style === 'classic' ? ' selected' : ''}>经典标准样式</option>
        <option value="detailed"${cfg.style === 'detailed' ? ' selected' : ''}>详细合规样式</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>纸张大小</label><select id="ps_paper" style="width:100%;padding:9px;border:1px solid #e4e8ee;border-radius:8px">
        <option value="A4"${cfg.paperSize === 'A4' ? ' selected' : ''}>A4</option>
        <option value="A5"${cfg.paperSize === 'A5' ? ' selected' : ''}>A5</option></select></div>
      <div class="form-group"><label>正文字号</label><select id="ps_fontsize" style="width:100%;padding:9px;border:1px solid #e4e8ee;border-radius:8px">
        <option value="12px"${cfg.fontSize === '12px' ? ' selected' : ''}>小 (12px)</option>
        <option value="13px"${cfg.fontSize === '13px' ? ' selected' : ''}>标准 (13px)</option>
        <option value="14px"${cfg.fontSize === '14px' ? ' selected' : ''}>大 (14px)</option></select></div></div>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" id="ps_gsp"${cfg.showGSPNote ? ' checked' : ''}> 页脚显示GSP合规条款</label>
    </div>`
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay show'
  overlay.innerHTML = `<div class="modal" style="max-width:640px;width:92%"><div class="modal-header"><div class="modal-title">出库单打印设置</div><button class="modal-close">✕</button></div>${html}<div class="modal-footer"><button class="btn" style="background:#f0f2f5" id="ps_cancel">取消</button><button class="btn btn-primary" id="ps_save">保存</button></div></div>`
  document.body.appendChild(overlay)
  overlay.querySelector('.modal-close').onclick = overlay.querySelector('#ps_cancel').onclick = () => overlay.remove()
  overlay.querySelector('#ps_save').onclick = () => {
    const g = (id) => overlay.querySelector('#' + id)
    localStorage.setItem(PRINT_CFG_KEY, JSON.stringify({
      companyName: g('ps_company').value, companyAddr: g('ps_addr').value, companyPhone: g('ps_phone').value,
      style: g('ps_style').value, paperSize: g('ps_paper').value, fontSize: g('ps_fontsize').value,
      showGSPNote: g('ps_gsp').checked,
    }))
    overlay.remove()
    window.alert('打印设置已保存')
  }
}
function printOutbound(row) {
  const cfg = getPrintConfig()
  const detailed = cfg.style === 'detailed'
  const th = (t) => `<td style="background:#f5f7fa;font-weight:600;width:110px;padding:6px 10px;border:1px solid #d8dee6">${t}</td>`
  const td = (v) => `<td style="padding:6px 10px;border:1px solid #d8dee6">${v ?? '-'}</td>`
  const rowsHtml = detailed ? [
    ['出库单号', row.order_no, '日期', row.date], ['客户名称', row.customer, '客户许可证', row.customer_license],
    ['设备名称', row.equip_name, 'UDI', row.equip_udi], ['批号', row.batch, '注册证号', row.reg_cert],
    ['生产厂家', row.factory_name, '生产许可证号', row.prod_license_no],
    ['数量', (row.qty ?? '-') + (row.unit || ''), '单价/总金额', `￥${row.price ?? 0} / ￥${row.total ?? 0}`],
    ['生产日期', row.prod_date, '有效期至', row.expire_date],
    ['制单人', row.operator, '收货人', row.recipient],
    ['运输条件', row.transport_condition, '储存条件', row.storage_condition],
    ['出库状态', row.status, '备注', row.note],
  ] : [
    ['出库单号', row.order_no, '日期', row.date], ['客户名称', row.customer, '设备名称', row.equip_name],
    ['批号', row.batch, '数量', (row.qty ?? '-') + (row.unit || '')],
    ['总金额', `￥${row.total ?? 0}`, '出库状态', row.status], ['收货人', row.recipient, '制单人', row.operator],
  ]
  const bodyAll = []
  for (let i = 0; i < rowsHtml.length; i += 2) {
    const a = rowsHtml[i], b = rowsHtml[i + 1] || ['', '', '', '']
    bodyAll.push(`<tr>${th(a[0])}${td(a[1])}${th(a[2])}${td(a[3])}${th(b[0])}${td(b[1])}${th(b[2])}${td(b[3])}</tr>`)
  }
  const gsp = cfg.showGSPNote ? '<p style="font-size:11px;color:#888;margin-top:14px;text-align:center">本单据依据《医疗器械经营质量管理规范》（GSP第59-67条）生成，出库须经质量复核确认。</p>' : ''
  const w = window.open('', '_blank', 'width=900,height=680')
  if (!w) { window.alert('浏览器拦截了打印窗口，请允许弹窗后重试'); return }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>出库单 ${row.order_no || ''}</title>
    <style>body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#222;${cfg.paperSize === 'A5' ? 'width:148mm;' : 'width:210mm;'}margin:0 auto;padding:24px;font-size:${cfg.fontSize}}
    h1{font-size:20px;text-align:center;margin:0 0 4px}.sub{text-align:center;color:#666;font-size:12px;margin-bottom:6px}
    .co{text-align:center;font-size:15px;font-weight:600;margin-bottom:2px}
    table{border-collapse:collapse;width:100%;margin-top:12px}
    .sign{margin-top:36px;display:flex;justify-content:space-between;font-size:13px}
    @media print{body{padding:0}}</style></head><body>
    <div class="co">${cfg.companyName}</div><h1>销 售 出 库 单</h1>
    <div class="sub">地址：${cfg.companyAddr}　电话：${cfg.companyPhone}</div>
    <table>${bodyAll.join('')}</table>
    <div class="sign"><span>发货人：__________</span><span>质量复核：__________</span><span>收货人签字：__________</span></div>
    ${gsp}
    <script>window.onload=function(){window.print()}<\/script>
    </body></html>`)
  w.document.close()
}
async function save() {
  saving.value = true
  try {
    if (editId.value) await crud.update(resource.value, editId.value, form.value)
    else await crud.create(resource.value, form.value)
    showModal.value = false
    await reload()
  } catch (e) { window.alert('保存失败：' + e.message) }
  finally { saving.value = false }
}
async function doDelete(row) {
  if (!window.confirm('确定删除该记录吗？此操作不可恢复。')) return
  try {
    await crud.remove(resource.value, row.id)
    await reload()
  } catch (e) { window.alert('删除失败：' + e.message) }
}

// ===== 工作流操作 =====
function askOpinion(defaultText) {
  return window.prompt('审批意见（可留空）', defaultText || '') || ''
}
async function doReview(row, action) {
  const opinion = askOpinion(action === 'approve' ? '资料齐全，同意' : '')
  try {
    await workflow.review(resource.value, row.id, action, opinion)
    await reload()
  } catch (e) { window.alert('审核失败：' + e.message) }
}
async function doApprove(row, action) {
  const opinion = askOpinion(action === 'approve' ? '同意' : '')
  try {
    await workflow.approve(resource.value, row.id, action, opinion)
    await reload()
  } catch (e) { window.alert('审批失败：' + e.message) }
}
async function doPlanReview(row, action) {
  const opinion = askOpinion(action === 'approve' ? '同意，进入采购流程' : '')
  try {
    await workflow.reviewPlan(row.id, action, opinion)
    await reload()
  } catch (e) { window.alert('审批失败：' + e.message) }
}
async function doConvert(row) {
  if (!window.confirm('将该计划转为采购执行单？')) return
  try {
    const d = await workflow.convertPlan(row.id)
    window.alert('已生成采购执行单 ' + (d.order_no || ''))
    await reload()
  } catch (e) { window.alert('转换失败：' + e.message) }
}
async function doProc(row, step) {
  try {
    await workflow.procFlow(resource.value, row.id, step, 'approve')
    await reload()
  } catch (e) { window.alert('操作失败：' + e.message) }
}

// ===== 销售出库六级流（P3） =====
async function doOutbound(row, action) {
  const opinion = askOpinion(action === 'approve' ? '同意出库' : '')
  try {
    const d = await workflow.outboundFlow(row.id, action, opinion)
    if (d && d.message) window.alert(d.message)
    await reload()
  } catch (e) { window.alert('审批失败：' + e.message) }
}

// ===== 产品验收五步流（P3） =====
async function doPa(row, step) {
  const labels = { appearance: '外观检查', quantity: '数量核对', quality: '质量检验' }
  let result = '合格'
  try { result = (window.prompt(`【${labels[step]}】判定结果（合格 / 不合格）`, '合格') || '合格').trim() } catch { result = '合格' }
  if (result !== '合格' && result !== '不合格') result = '不合格'
  const remark = askOpinion(result === '合格' ? '符合要求' : '')
  try {
    const d = await workflow.paStep(row.id, { step, result, remark })
    if (d && d.message) window.alert(d.message)
    await reload()
  } catch (e) { window.alert('操作失败：' + e.message) }
}
async function doPaFinal(row) {
  let verdict = ''
  while (!['合格', '不合格', '有条件合格'].includes(verdict)) {
    verdict = (window.prompt('综合判定结果（合格 / 不合格 / 有条件合格）', '合格') || '').trim()
    if (verdict === null) return
    if (!['合格', '不合格', '有条件合格'].includes(verdict)) window.alert('请输入：合格 / 不合格 / 有条件合格')
    else break
  }
  const opinion = askOpinion(verdict === '合格' ? '五步验收全部通过' : '')
  try {
    const d = await workflow.paStep(row.id, { step: 'approve', overall_result: verdict, opinion })
    if (d && d.message) window.alert(d.message)
    await reload()
  } catch (e) { window.alert('操作失败：' + e.message) }
}
async function doPaReset(row) {
  if (!window.confirm('将该验收记录重置为「待验收」重新执行五步验收？')) return
  try {
    await workflow.paReset(row.id)
    await reload()
  } catch (e) { window.alert('重置失败：' + e.message) }
}

watch(() => route.params.id, async (id) => {
  if (!id) return
  const m = menuItems.find(x => x.id === id)
  title.value = m ? m.label : id
  resource.value = moduleResource[id] || ''
  wf.value = { mode: WF_TWO.includes(resource.value) ? 'two'
    : WF_PLAN.includes(resource.value) ? 'plan'
    : WF_PROC.includes(resource.value) ? 'proc'
    : WF_OUTBOUND.includes(resource.value) ? 'outbound'
    : WF_PA.includes(resource.value) ? 'pa'
    : '' }
  page.value = 1
  keyword.value = ''
  rows.value = []
  columns.value = []
  if (resource.value) {
    await reload()
    if (rows.value.length && !columns.value.length) columns.value = deriveColumns(rows.value)
    else if (!rows.value.length) {
      try {
        const meta = await crud.list(resource.value, { page: 1, size: 1 })
        columns.value = (meta.records || meta.items || []) && (meta.records || meta.items || []).length ? deriveColumns(meta.records || meta.items || []) : []
      } catch (e) {}
    }
  }
}, { immediate: true })
</script>
