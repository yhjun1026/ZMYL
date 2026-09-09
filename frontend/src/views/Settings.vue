<template>
  <div>
    <!-- 统计卡片 -->
    <div class="stat-row" v-if="stats">
      <div class="stat-card"><div class="stat-card-value">{{ stats.total_devices || 0 }}</div><div class="stat-card-label">设备总数</div></div>
      <div class="stat-card"><div class="stat-card-value">{{ stats.total_inventory_qty || 0 }}</div><div class="stat-card-label">库存总量</div></div>
      <div class="stat-card"><div class="stat-card-value">{{ stats.total_personnel || 0 }}</div><div class="stat-card-label">人员档案</div></div>
      <div class="stat-card"><div class="stat-card-value">{{ stats.outbound_count || 0 }}</div><div class="stat-card-label">近30天出库</div></div>
    </div>

    <div class="two-col">
      <!-- 修改密码 -->
      <div class="card">
        <div class="card-header"><div class="card-title">修改密码</div></div>
        <div style="padding:10px 0">
          <div class="form-group"><label>原密码</label><input type="password" v-model="pwdForm.oldPassword" placeholder="请输入原密码"></div>
          <div class="form-group"><label>新密码</label><input type="password" v-model="pwdForm.newPassword" placeholder="至少6位，含字母和数字"></div>
          <div class="form-group"><label>确认新密码</label><input type="password" v-model="pwdForm.confirm" placeholder="再次输入新密码"></div>
          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-primary" @click="changePassword">修改密码</button>
            <span style="font-size:13px" :style="{ color: pwdMsg.ok ? '#27ae60' : '#e74c3c' }">{{ pwdMsg.text }}</span>
          </div>
        </div>
      </div>

      <!-- 当前用户信息 -->
      <div class="card">
        <div class="card-header"><div class="card-title">当前用户信息</div></div>
        <div style="padding:10px 0">
          <div class="info-line" v-for="f in userInfoFields" :key="f.label">
            <div class="info-label">{{ f.label }}</div><div class="info-value">{{ f.value || '-' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统信息 -->
    <div class="card" style="margin-top:18px">
      <div class="card-header"><div class="card-title">系统信息</div></div>
      <div class="sys-grid">
        <div><span class="info-label">系统名称</span><div class="info-value">医疗器械智能管理平台</div></div>
        <div><span class="info-label">版本号</span><div class="info-value">v3.0</div></div>
        <div><span class="info-label">架构类型</span><div class="info-value">B/S架构</div></div>
        <div><span class="info-label">后端框架</span><div class="info-value">Node.js 20 + Express + SQLite</div></div>
        <div><span class="info-label">前端技术</span><div class="info-value">Vue 3 + Vite + Pinia</div></div>
        <div><span class="info-label">认证方式</span><div class="info-value">JWT (HS256)</div></div>
        <div><span class="info-label">合规标准</span><div class="info-value">GSP 医疗器械经营质量管理规范</div></div>
        <div><span class="info-label">安全特性</span><div class="info-value">JWT鉴权 · 角色权限 · 操作审计</div></div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="card" style="margin-top:18px">
      <div class="card-header"><div class="card-title">快捷操作</div></div>
      <div style="display:flex;gap:12px;padding:12px 0;flex-wrap:wrap">
        <button class="btn btn-outline" @click="$router.push('/module/operation-log')">📝 查看操作日志</button>
        <button class="btn btn-outline" @click="$router.push('/permission')">🔐 权限管理</button>
        <button class="btn btn-outline" @click="$router.push('/module/system-profile')">🏢 经营企业档案</button>
        <button class="btn btn-outline" @click="$router.push('/report')">📈 统计报表</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { dashboard, auth } from '../api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const stats = ref(null)
const me = ref({})
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const pwdMsg = ref({ text: '', ok: false })

const userInfoFields = computed(() => [
  { label: '用户名', value: me.value.username },
  { label: '姓名', value: me.value.name },
  { label: '所属部门', value: me.value.dept },
  { label: '角色', value: me.value.role },
  { label: '邮箱', value: me.value.email },
  { label: '电话', value: me.value.phone },
  { label: '最后登录', value: me.value.last_login_at },
])

async function changePassword() {
  pwdMsg.value = { text: '', ok: false }
  if (!pwdForm.oldPassword || !pwdForm.newPassword) { pwdMsg.value = { text: '请填写原密码和新密码', ok: false }; return }
  if (pwdForm.newPassword.length < 6) { pwdMsg.value = { text: '新密码至少6位', ok: false }; return }
  if (pwdForm.newPassword !== pwdForm.confirm) { pwdMsg.value = { text: '两次输入的新密码不一致', ok: false }; return }
  try {
    await auth.changePassword(pwdForm.oldPassword, pwdForm.newPassword)
    pwdMsg.value = { text: '密码修改成功', ok: true }
    pwdForm.oldPassword = ''; pwdForm.newPassword = ''; pwdForm.confirm = ''
  } catch (e) {
    pwdMsg.value = { text: e.message || '修改失败', ok: false }
  }
}

onMounted(async () => {
  try { stats.value = await dashboard() } catch {}
  try { me.value = await auth.me() || {} } catch {}
})
</script>

<style scoped>
.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.stat-card { background: #fff; border: 1px solid var(--border, #e4e8ee); border-radius: 10px; padding: 18px; text-align: center; }
.stat-card-value { font-size: 26px; font-weight: 700; color: var(--primary, #1e6fb8); }
.stat-card-label { font-size: 12px; color: var(--text-muted, #7f8c9b); margin-top: 4px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.info-line { display: flex; gap: 16px; margin-bottom: 12px; }
.info-label { font-size: 12px; color: var(--text-muted, #7f8c9b); width: 60px; flex-shrink: 0; }
.info-value { font-weight: 600; }
.sys-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 10px 0; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: var(--text, #2c3e50); margin-bottom: 6px; font-weight: 500; }
.form-group input {
  width: 100%; padding: 10px 12px; border: 1px solid #e4e8ee; border-radius: 8px; font-size: 14px; outline: none;
}
.form-group input:focus { border-color: #1e6fb8; }
@media (max-width: 900px) {
  .stat-row { grid-template-columns: repeat(2, 1fr); }
  .two-col, .sys-grid { grid-template-columns: 1fr; }
}
</style>
