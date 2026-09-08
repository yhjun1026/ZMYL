<template>
  <div v-if="title">
    <div class="card">
      <div class="card-header">
        <div class="card-title">{{ title }}</div>
        <div class="toolbar" style="margin-bottom:0">
          <input class="search-input" v-model="keyword" :placeholder="'搜索' + title + '...'" @keyup.enter="reload">
          <button class="btn btn-primary" @click="reload">🔍 查询</button>
          <div class="spacer"></div>
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
  </div>
  <div v-else class="loading-text"><div class="loading-spinner"></div><div class="loading-label">模块开发中</div></div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { menuItems, moduleResource } from '../router'
import { crud, workflow } from '../api'

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

// 工作流模式配置（与后端 workflow.py 对齐）
const WF_TWO = ['supplier', 'customer_archive', 'personnel', 'health_record',
                'training_plan', 'first_factory_audit', 'first_product_audit',
                'system_profile']
const WF_PLAN = ['purchase_plan']
const WF_PROC = ['proc_equipment', 'proc_consumable']

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
  return keys.slice(0, 9).map(k => ({
    key: k,
    label: k,
    tag: /status|state|workflow/.test(k),
    type: /date|time|expiry|valid/.test(k) ? 'date' : /qty|count|amount|price|num/.test(k) ? 'number' : 'text',
  }))
}

function openCreate() {
  editId.value = null
  form.value = {}
  showModal.value = true
}
function openEdit(row) {
  editId.value = row.id
  form.value = { ...row }
  showModal.value = true
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

watch(() => route.params.id, async (id) => {
  if (!id) return
  const m = menuItems.find(x => x.id === id)
  title.value = m ? m.label : id
  resource.value = moduleResource[id] || ''
  wf.value = { mode: WF_TWO.includes(resource.value) ? 'two' : WF_PLAN.includes(resource.value) ? 'plan' : WF_PROC.includes(resource.value) ? 'proc' : '' }
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
