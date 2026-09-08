<template>
  <div>
    <!-- 接入状态总览 -->
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">审批钩子总数</div><div class="stat-value">{{ hookInfo.total }}</div></div>
      <div class="stat-card"><div class="stat-label">已配置生效流程</div><div class="stat-value" style="color:#67c23a">{{ hookInfo.applied }}</div></div>
      <div class="stat-card"><div class="stat-label">流程版本总数</div><div class="stat-value">{{ list.length }}</div></div>
      <div class="stat-card"><div class="stat-label">待审批流程</div><div class="stat-value" style="color:#e6a23c">{{ pendingCount }}</div></div>
    </div>

    <!-- 流程列表 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <div class="card-title">审批流程配置（草稿 → 提交 → 质量负责人审批 → 生效）</div>
        <div>
          <select v-model="filterStatus" @change="load" style="margin-right:8px">
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="pending">待审批</option>
            <option value="active">已生效</option>
            <option value="rejected">已驳回</option>
            <option value="disabled">已停用</option>
          </select>
          <button class="btn btn-sm" @click="openEditor(null)">+ 新建流程</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>流程编码</th><th>流程名称</th><th>业务模块</th><th>版本</th><th>步骤数</th><th>状态</th><th>生效时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="f in list" :key="f.id">
              <td>{{ f.flow_code }}</td>
              <td>{{ f.flow_name }} <span v-if="f.is_current" class="tag-current">当前</span></td>
              <td>{{ f.biz_module_name || f.biz_module }}</td>
              <td>v{{ f.version }}</td>
              <td>{{ f.step_count }}</td>
              <td><span class="status-chip" :class="'st-' + f.status">{{ f.status_name }}</span></td>
              <td>{{ f.effective_at || '-' }}</td>
              <td class="op-cell">
                <button class="btn btn-sm" @click="openEditor(f)" v-if="f.can_edit">编辑</button>
                <button class="btn btn-sm" @click="doSubmit(f)" v-if="f.can_submit">提交</button>
                <button class="btn btn-sm" @click="doApprove(f, 'approve')" v-if="f.status === 'pending'">通过</button>
                <button class="btn btn-sm btn-outline" @click="doApprove(f, 'reject')" v-if="f.status === 'pending'">驳回</button>
                <button class="btn btn-sm btn-outline" @click="doNewVersion(f)" v-if="f.status === 'active'">新版本</button>
                <button class="btn btn-sm btn-outline" @click="doDisable(f)" v-if="f.status === 'active'">停用</button>
                <button class="btn btn-sm btn-outline" @click="viewLogs(f)">日志</button>
                <button class="btn btn-sm btn-danger" @click="doRemove(f)" v-if="!['active','pending'].includes(f.status)">删除</button>
              </td>
            </tr>
            <tr v-if="!list.length"><td colspan="8" style="text-align:center;color:#999;padding:24px">暂无流程，点击右上角「新建流程」开始配置</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 钩子接入状态 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">审批钩子接入状态（业务单据读取生效流程实时驱动）</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>钩子</th><th>业务模块</th><th>步骤</th><th>生效流程</th><th>步骤名</th><th>审批角色</th><th>可驳回</th></tr></thead>
          <tbody>
            <tr v-for="h in hooks" :key="h.hook">
              <td>{{ h.label }}</td>
              <td>{{ h.biz_module }}</td>
              <td>第{{ h.step_no }}步</td>
              <td>{{ h.flow_applied ? `${h.flow_name} v${h.version}` : '（未配置，走默认规则）' }}</td>
              <td>{{ h.step_name || '-' }}</td>
              <td>{{ h.approver_role_name || h.approver_role || '-' }}</td>
              <td>{{ h.flow_applied ? (h.can_reject ? '是' : '否') : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div class="modal-mask" v-if="showEditor" @click.self="showEditor = false">
      <div class="modal-box">
        <div class="modal-title">{{ editing.id ? '编辑流程' : '新建流程' }}</div>
        <div class="form-grid">
          <label>流程编码<input v-model="editing.flow_code" :disabled="!!editing.id" placeholder="如 supplier_audit" /></label>
          <label>流程名称<input v-model="editing.flow_name" placeholder="如 供应商两级审批流" /></label>
          <label>业务模块
            <select v-model="editing.biz_module">
              <option v-for="m in meta.biz_modules" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
          <label>流程说明<input v-model="editing.description" placeholder="可选" /></label>
        </div>
        <div class="steps-head">
          <span>审批步骤</span>
          <button class="btn btn-sm" @click="addStep">+ 加一步</button>
        </div>
        <div v-for="(s, i) in editing.steps" :key="i" class="step-row">
          <span class="step-no">{{ i + 1 }}</span>
          <input v-model="s.step_name" placeholder="步骤名称" style="width:130px" />
          <select v-model="s.approver_role" @change="onRoleChange(s)">
            <option value="">（不限角色）</option>
            <option v-for="r in meta.roles" :key="r.code" :value="r.code">{{ r.name }}</option>
          </select>
          <label class="chk"><input type="checkbox" v-model="s.is_required" />必经</label>
          <label class="chk"><input type="checkbox" v-model="s.can_reject" />可驳回</label>
          <button class="btn btn-sm btn-danger" @click="editing.steps.splice(i, 1)">删</button>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" @click="showEditor = false">取消</button>
          <button class="btn" @click="saveFlow">保存</button>
        </div>
      </div>
    </div>

    <!-- 日志弹窗 -->
    <div class="modal-mask" v-if="showLogs" @click.self="showLogs = false">
      <div class="modal-box">
        <div class="modal-title">流程变更日志（GSP 可追溯）</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>时间</th><th>动作</th><th>状态变更</th><th>操作人</th><th>意见</th></tr></thead>
            <tbody>
              <tr v-for="l in logs" :key="l.id">
                <td>{{ l.created_at }}</td><td>{{ l.action }}</td>
                <td>{{ l.from_status }} → {{ l.to_status }}</td>
                <td>{{ l.operator_name }}</td><td>{{ l.opinion || '-' }}</td>
              </tr>
              <tr v-if="!logs.length"><td colspan="5" style="text-align:center;color:#999">暂无日志</td></tr>
            </tbody>
          </table>
        </div>
        <div class="modal-foot"><button class="btn" @click="showLogs = false">关闭</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { flowApi } from '../api'

const list = ref([])
const hooks = ref([])
const hookInfo = ref({ total: 0, applied: 0 })
const meta = ref({ biz_modules: [], roles: [] })
const filterStatus = ref('')
const showEditor = ref(false)
const showLogs = ref(false)
const logs = ref([])
const editing = ref({ steps: [] })

const pendingCount = computed(() => list.value.filter(f => f.status === 'pending').length)

async function load() {
  try {
    const d = await flowApi.list(filterStatus.value ? { status: filterStatus.value } : {})
    list.value = d.list || []
  } catch (e) { window.alert('加载失败：' + e.message) }
}
async function loadHooks() {
  try {
    const d = await flowApi.hooks()
    hooks.value = d.hooks || []
    hookInfo.value = { total: d.total, applied: d.applied }
  } catch { /* 忽略 */ }
}
async function loadMeta() {
  try { meta.value = await flowApi.meta() } catch { /* 忽略 */ }
}

function blankFlow() {
  return {
    id: null, flow_code: '', flow_name: '', biz_module: meta.value.biz_modules[0]?.id || 'supplier',
    description: '', steps: [{ step_no: 1, step_name: '质管审核', approver_role: '', approver_role_name: '', is_required: true, can_reject: true, reject_action: 'to_prev' }],
  }
}
async function openEditor(f) {
  if (!f) { editing.value = blankFlow() }
  else {
    const d = await flowApi.get(f.id)
    editing.value = {
      id: d.id, flow_code: d.flow_code, flow_name: d.flow_name, biz_module: d.biz_module,
      description: d.description || '',
      steps: (d.steps || []).map(s => ({
        step_no: s.step_no, step_name: s.step_name, approver_role: s.approver_role,
        approver_role_name: s.approver_role_name, is_required: !!s.is_required,
        can_reject: !!s.can_reject, reject_action: s.reject_action || 'to_prev',
      })),
    }
  }
  showEditor.value = true
}
function addStep() {
  editing.value.steps.push({ step_no: editing.value.steps.length + 1, step_name: '', approver_role: '', approver_role_name: '', is_required: true, can_reject: true, reject_action: 'to_prev' })
}
function onRoleChange(s) {
  const r = meta.value.roles.find(x => x.code === s.approver_role)
  s.approver_role_name = r ? r.name : ''
}
async function saveFlow() {
  const e = editing.value
  if (!e.flow_code || !e.flow_name) return window.alert('流程编码与名称必填')
  if (!e.steps.length) return window.alert('至少配置一个步骤')
  e.steps.forEach((s, i) => { s.step_no = i + 1 })
  try {
    if (e.id) await flowApi.update(e.id, e)
    else await flowApi.create(e)
    showEditor.value = false
    await load(); await loadHooks()
  } catch (err) { window.alert(err.message) }
}
async function doSubmit(f) {
  try { await flowApi.submit(f.id); await load() } catch (e) { window.alert(e.message) }
}
async function doApprove(f, action) {
  const opinion = action === 'approve' ? '同意' : (window.prompt('驳回意见：') || '')
  if (action === 'reject' && !opinion) return
  try {
    const d = await flowApi.approve(f.id, action, opinion)
    window.alert(d && d.message ? d.message : '操作完成')
    await load(); await loadHooks()
  } catch (e) { window.alert(e.message) }
}
async function doNewVersion(f) {
  try {
    await flowApi.newVersion(f.id)
    window.alert('已生成新版本草稿，请编辑后提交审批')
    await load()
  } catch (e) { window.alert(e.message) }
}
async function doDisable(f) {
  if (!window.confirm(`确认停用流程「${f.flow_name} v${f.version}」？相关业务模块将回退默认审批规则`)) return
  try { await flowApi.disable(f.id); await load(); await loadHooks() } catch (e) { window.alert(e.message) }
}
async function doRemove(f) {
  if (!window.confirm(`确认删除流程「${f.flow_name} v${f.version}」？`)) return
  try { await flowApi.remove(f.id); await load(); await loadHooks() } catch (e) { window.alert(e.message) }
}
async function viewLogs(f) {
  try { logs.value = (await flowApi.logs(f.id)).list || [] } catch { logs.value = [] }
  showLogs.value = true
}

onMounted(() => { load(); loadHooks(); loadMeta() })
</script>

<style scoped>
.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.stat-card { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 16px; }
.stat-label { font-size: 13px; color: #909399; }
.stat-value { font-size: 26px; font-weight: 700; color: #303133; margin-top: 6px; }
.status-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.st-draft { background: #f4f4f5; color: #909399; }
.st-pending { background: #fdf6ec; color: #e6a23c; }
.st-active { background: #f0f9eb; color: #67c23a; }
.st-rejected { background: #fef0f0; color: #f56c6c; }
.st-disabled { background: #f4f4f5; color: #606266; }
.st-archived { background: #f4f4f5; color: #c0c4cc; }
.tag-current { font-size: 11px; color: #409eff; border: 1px solid #409eff; border-radius: 4px; padding: 0 4px; }
.op-cell button { margin: 2px; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 300; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #fff; border-radius: 8px; padding: 20px; width: 720px; max-width: 94vw; max-height: 86vh; overflow-y: auto; }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.form-grid label { display: flex; flex-direction: column; font-size: 13px; color: #606266; gap: 4px; }
.form-grid input, .form-grid select { padding: 6px 8px; border: 1px solid #dcdfe6; border-radius: 4px; }
.steps-head { display: flex; justify-content: space-between; align-items: center; margin: 10px 0 6px; font-weight: 600; font-size: 14px; }
.step-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px dashed #ebeef5; }
.step-row input, .step-row select { padding: 5px 8px; border: 1px solid #dcdfe6; border-radius: 4px; }
.step-no { width: 22px; height: 22px; border-radius: 50%; background: #409eff; color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.chk { display: flex; align-items: center; gap: 3px; font-size: 12px; color: #606266; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.btn-danger { color: #f56c6c; border-color: #f56c6c; background: #fff; }
</style>
