<template>
  <div>
    <!-- Tab 切换：权限矩阵 / 用户管理 -->
    <div class="perm-tabs">
      <button class="tab-btn" :class="{ active: tab === 'matrix' }" @click="tab = 'matrix'">权限矩阵</button>
      <button v-if="auth.isSysAdmin" class="tab-btn" :class="{ active: tab === 'users' }" @click="tab = 'users'">用户管理</button>
    </div>

    <!-- ===== 权限矩阵 ===== -->
    <div v-if="tab === 'matrix'">
      <div class="card">
        <div class="card-header">
          <div class="card-title">角色权限矩阵 ({{ permRoles.length }}角色 × {{ permModules.length }}节点) — 依据《医疗器械经营质量管理规范》</div>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
          <span v-for="(color, name) in permColors" :key="name" style="display:flex;align-items:center;gap:4px;font-size:12px">
            <span :style="{ width: '12px', height: '12px', borderRadius: '3px', background: color, display: 'inline-block' }"></span>{{ name }}
          </span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="min-width:110px">模块 \ 角色</th>
                <th v-for="r in permRoles" :key="r.code" style="min-width:70px">
                  {{ r.name }}<br><span style="font-size:10px;font-weight:400;color:var(--text-muted)">({{ roleCount(r.code) }}人)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in permModules" :key="m">
                <td style="font-weight:500">{{ m }}</td>
                <td v-for="r in permRoles" :key="r.code">
                  <span class="perm-cell" :style="permCellStyle(permMap[r.code][i])">{{ permMap[r.code][i] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-header">
          <div class="card-title">角色详细说明 — 医疗器械有限公司 岗位配置</div>
        </div>
        <div class="role-cards">
          <div class="role-card" v-for="r in roles" :key="r.code">
            <div class="role-name">{{ r.name }} <span style="font-size:11px;color:var(--text-muted);font-family:monospace">{{ r.code }}</span></div>
            <div class="role-code">{{ r.desc }}</div>
            <div class="role-stats">
              <span>👤 {{ roleCount(r.code) }}人</span>
              <span>📋 {{ opCount(r.code) }}个操作节点</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 用户管理 ===== -->
    <div v-if="tab === 'users' && auth.isSysAdmin">
      <div class="card">
        <div class="card-header">
          <div class="card-title">用户管理 ({{ users.length }}人)</div>
          <div class="toolbar" style="margin-bottom:0">
            <input class="search-input" v-model="keyword" placeholder="搜索用户名/姓名/电话..." @keyup.enter="loadUsers">
            <button class="btn btn-primary" @click="loadUsers">🔍 查询</button>
            <button class="btn btn-primary" @click="openCreate">＋ 新建用户</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>用户名</th><th>姓名</th><th>所属部门</th><th>角色</th><th>邮箱</th><th>电话</th><th>状态</th><th style="width:220px">操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="u in sortedUsers" :key="u.id">
                <td><b>{{ u.username }}</b></td>
                <td>{{ u.name }}</td>
                <td>{{ u.dept || '-' }}</td>
                <td><span class="tag tag-info">{{ roleName(u.role_code) || u.role || u.role_code }}</span></td>
                <td>{{ u.email || '-' }}</td>
                <td>{{ u.phone || '-' }}</td>
                <td><span class="tag" :class="u.status === '启用' ? 'tag-success' : 'tag-danger'">{{ u.status || '启用' }}</span></td>
                <td class="action-cell">
                  <button class="btn btn-sm btn-outline" @click="openEdit(u)">编辑</button>
                  <button class="btn btn-sm btn-outline" :style="{ color: u.status === '启用' ? 'var(--danger)' : 'var(--success)' }" @click="toggleStatus(u)">{{ u.status === '启用' ? '禁用' : '启用' }}</button>
                  <button class="btn btn-sm btn-outline" @click="resetPwd(u)">重置密码</button>
                  <button class="btn btn-sm btn-danger" @click="doDelete(u)">删除</button>
                </td>
              </tr>
              <tr v-if="!users.length">
                <td colspan="8"><div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">暂无用户</div></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 新建/编辑用户弹窗 -->
    <div class="modal-overlay" :class="{ show: showModal }">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">{{ editId ? '编辑用户' : '新建用户' }}</div>
          <button class="modal-close" @click="showModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label>用户名<span v-if="!editId" style="color:var(--danger)"> *</span></label>
              <input v-model="form.username" :disabled="!!editId" placeholder="登录用户名"></div>
            <div class="form-group"><label>姓名<span style="color:var(--danger)"> *</span></label>
              <input v-model="form.name" placeholder="真实姓名"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>所属部门</label><input v-model="form.dept" placeholder="如：质量管理部"></div>
            <div class="form-group"><label>角色<span style="color:var(--danger)"> *</span></label>
              <select v-model="form.role_code" class="form-select">
                <option value="" disabled>请选择角色</option>
                <option v-for="r in roles" :key="r.code" :value="r.code">{{ r.name }}（{{ r.code }}）</option>
              </select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>电话</label><input v-model="form.phone" placeholder="联系电话"></div>
            <div class="form-group"><label>邮箱</label><input v-model="form.email" placeholder="电子邮箱"></div>
          </div>
          <div class="form-row" v-if="!editId">
            <div class="form-group"><label>初始密码<span style="color:var(--danger)"> *</span></label>
              <input v-model="form.password" type="password" placeholder="至少6位"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" style="background:#f0f2f5" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { user } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const tab = ref('matrix')
const roles = ref([])
const users = ref([])
const keyword = ref('')
const showModal = ref(false)
const editId = ref(null)
const saving = ref(false)
const form = ref({})

// ===== 角色权限矩阵（一比一还原原版 renderPermission） =====
const permRoles = [
  { code: 'sys_admin', name: '系统管理员', desc: '系统全部权限管理、用户管理、系统参数设置' },
  { code: 'quality_mgr', name: '质量负责人', desc: '质量体系全面管理、各环节审批、人员/标准/不良事件管理' },
  { code: 'quality_staff', name: '质管员', desc: '首营审核、在库养护、到货验收、不良事件、追溯召回、对标检查' },
  { code: 'inspector', name: '验收巡检员', desc: '到货验收、巡检、在库养护、对标检查执行' },
  { code: 'purchaser', name: '采购员', desc: '采购计划编制、采购入库验收、供货单位管理、首营资料' },
  { code: 'warehouse', name: '库管员', desc: '库存台账管理、出入库操作、在库养护、效期管理' },
  { code: 'sales_director', name: '销售总监', desc: '销售团队管理、采购计划审核、财务经营统计、报表查看' },
  { code: 'regional_sales_mgr', name: '区域销售经理', desc: '区域销售管理、购货单位档案维护、出库审批' },
  { code: 'sales_mgr', name: '销售经理', desc: '销售业务执行、销售出库单第一级审核' },
  { code: 'device_mgr', name: '设备管理员', desc: '医疗器械台账管理、设备验收/巡检操作、资产维护' },
  { code: 'repairer', name: '维修工程师', desc: '设备维修保养执行、不良事件报告' },
  { code: 'calibrator', name: '计量员', desc: '计量器具校准管理、校准记录维护' },
  { code: 'admin_dept', name: '综合行政部', desc: '首营资料录入、购货单位档案录入、销售单录入、资质证件效期提醒、经营企业档案、健康档案管理' },
]
const permModules = ['智能工作台','首营生产企业','首营品种','供货单位档案','资质证件效期','采购计划','采购入库验收','在库养护','到货验收','器械台账','库存台账','效期预警','维修保养','计量校准','购货单位档案','销售出库','不良事件','追溯召回','强制标准','人员资质','健康档案','经营企业档案','财务统计','统计报表','操作规程','审计日志']
const permMap = {
  sys_admin:           Array(permModules.length).fill('管理'),
  quality_mgr:         ['查看','审批','审批','审批','查看','审批','审批','查看','查看','查看','查看','查看','管理','查看','审批','审批','管理','管理','管理','管理','管理','管理','管理','管理','查看','管理'],
  quality_staff:       ['查看','操作','操作','操作','查看','查看','查看','管理','操作','查看','查看','管理','查看','查看','查看','操作','操作','操作','操作','操作','操作','查看','-','-','查看','查看'],
  inspector:           ['查看','查看','查看','-','查看','查看','查看','操作','操作','管理','查看','操作','操作','查看','-','-','操作','查看','操作','-','-','-','-','-','查看','-'],
  purchaser:           ['查看','操作','操作','操作','查看','管理','管理','查看','查看','查看','查看','查看','-','-','-','-','-','查看','-','-','-','-','-','查看','查看','-'],
  warehouse:           ['查看','-','-','-','查看','查看','操作','操作','操作','查看','管理','管理','查看','查看','-','操作','-','操作','查看','-','-','-','-','-','查看','-'],
  sales_director:      ['查看','查看','查看','查看','查看','审批','查看','查看','查看','查看','查看','查看','-','-','管理','审批','查看','查看','查看','查看','查看','查看','管理','管理','查看','查看'],
  regional_sales_mgr:  ['查看','-','-','-','查看','-','-','-','查看','-','-','-','-','-','管理','操作','-','-','-','-','-','-','-','查看','查看','-'],
  sales_mgr:           ['查看','-','-','-','查看','-','-','-','查看','-','-','-','-','-','查看','审批','-','-','-','-','-','-','-','查看','查看','-'],
  device_mgr:          ['查看','查看','查看','-','-','查看','查看','查看','查看','管理','查看','查看','管理','查看','-','-','操作','查看','查看','-','-','-','-','-','查看','-'],
  repairer:            ['查看','-','-','-','-','-','-','-','-','查看','-','-','操作','-','-','-','操作','-','-','-','-','-','-','-','查看','-'],
  calibrator:          ['查看','-','-','-','-','-','-','-','-','查看','-','-','-','管理','-','-','-','-','查看','-','-','-','-','-','查看','-'],
  admin_dept:          ['查看','操作','操作','操作','查看','-','-','-','-','-','-','查看','-','-','管理','操作','-','-','-','查看','操作','管理','-','-','查看','-'],
}
const permColors = { '管理': '#1e6fb8', '审批': '#c0392b', '操作': '#27ae60', '查看': '#95a5b8' }

function roleCount(code) {
  return users.value.filter(u => (u.role_code || u.role) === code).length
}
function opCount(code) {
  const row = permMap[code]
  return row ? row.filter(p => p !== '-' && p !== '查看').length : 0
}
function roleName(code) {
  const r = roles.value.find(x => x.code === code)
  if (r) return r.name
  const b = permRoles.find(x => x.code === code)
  return b ? b.name : code
}
function permCellStyle(p) {
  const c = permColors[p] || '#95a5b8'
  return {
    display: 'inline-block', padding: '2px 8px', borderRadius: '3px', fontSize: '12px', fontWeight: 500,
    background: c + '15', color: c, border: '1px solid ' + c + '40',
  }
}

const sortedUsers = computed(() => {
  const deptOrder = { '系统管理员': 0, '质量管理部': 1, '采购部': 2, '仓储部': 3, '销售部': 4, '设备管理部': 5, '综合行政部': 6 }
  return [...users.value].sort((a, b) => {
    const da = deptOrder[a.dept] !== undefined ? deptOrder[a.dept] : 99
    const db = deptOrder[b.dept] !== undefined ? deptOrder[b.dept] : 99
    if (da !== db) return da - db
    return (a.name || '').localeCompare(b.name || '')
  })
})

async function loadRoles() {
  try { roles.value = await user.listRoles() || [] } catch { roles.value = [] }
}
async function loadUsers() {
  try {
    const d = await user.list({ page: 1, size: 100, keyword: keyword.value || undefined })
    users.value = d.list || d.records || d.items || []
  } catch (e) { window.alert('加载用户列表失败：' + e.message) }
}

function openCreate() {
  editId.value = null
  form.value = {}
  showModal.value = true
}
function openEdit(u) {
  editId.value = u.id
  form.value = { username: u.username, name: u.name, dept: u.dept, role_code: u.role_code, phone: u.phone, email: u.email }
  showModal.value = true
}
async function save() {
  saving.value = true
  try {
    if (editId.value) {
      const { username, ...payload } = form.value
      await user.update(editId.value, payload)
    } else {
      await user.create(form.value)
    }
    showModal.value = false
    await loadUsers()
  } catch (e) { window.alert('保存失败：' + e.message) }
  finally { saving.value = false }
}
async function toggleStatus(u) {
  try {
    await user.update(u.id, { status: u.status === '启用' ? '禁用' : '启用' })
    await loadUsers()
  } catch (e) { window.alert('操作失败：' + e.message) }
}
async function resetPwd(u) {
  const pwd = window.prompt(`为用户「${u.username}」设置新密码（至少6位）`, '')
  if (!pwd) return
  if (pwd.length < 6) { window.alert('密码至少6位'); return }
  try {
    await user.resetPassword(u.id, pwd)
    window.alert(`已重置「${u.username}」的密码`)
  } catch (e) { window.alert('重置失败：' + e.message) }
}
async function doDelete(u) {
  if (!window.confirm(`确定删除用户「${u.username}」吗？此操作不可恢复。`)) return
  try {
    await user.remove(u.id)
    await loadUsers()
  } catch (e) { window.alert('删除失败：' + e.message) }
}

onMounted(() => {
  loadRoles()
  loadUsers()
})
</script>

<style scoped>
.perm-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.tab-btn {
  padding: 8px 20px; border: 1px solid var(--border, #e4e8ee); background: #fff; border-radius: 6px;
  cursor: pointer; font-size: 13px; color: var(--text, #2c3e50); transition: all 0.15s;
}
.tab-btn.active { background: var(--primary, #1e6fb8); color: #fff; border-color: var(--primary, #1e6fb8); }
.perm-cell { line-height: 1.6; }
.role-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; padding: 12px 0; }
.role-card { border: 1px solid var(--border, #e4e8ee); border-radius: 8px; padding: 14px; }
.role-name { font-weight: 600; margin-bottom: 6px; }
.role-code { font-size: 12px; color: var(--text-muted, #7f8c9b); margin-bottom: 8px; line-height: 1.6; }
.role-stats { display: flex; gap: 14px; font-size: 12px; color: var(--text-muted, #7f8c9b); }
.form-select {
  width: 100%; padding: 9px 12px; border: 1px solid #e4e8ee; border-radius: 8px; font-size: 14px; outline: none;
  background: #fff;
}
</style>
