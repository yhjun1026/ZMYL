<template>
  <div class="app-container">
    <!-- 侧边栏（原版 .sidebar 一比一） -->
    <aside class="sidebar" :class="{ collapsed }">
      <div class="sidebar-header">
        <div class="logo">🏥</div>
        <div class="sys-name">医疗器械智能管理平台</div>
      </div>
      <nav class="sidebar-nav" id="sidebarNav">
        <template v-for="m in menuItems" :key="m.id">
          <div v-if="m.sep" class="nav-separator">{{ m.label.replace(/--/g, '').trim() }}</div>
          <div v-else class="nav-item" :class="{ active: activeId === m.id }" @click="navigate(m.id)">
            <span class="nav-icon">{{ m.icon }}</span>{{ m.label }}
            <span v-if="m.gsp" class="nav-gsp">{{ m.gsp }}</span>
          </div>
        </template>
      </nav>
      <div class="sidebar-footer">医疗器械 v3.0 · GSP合规</div>
    </aside>
    <div class="sidebar-overlay" :class="{ show: !collapsed }" @click="collapsed = true"></div>

    <!-- 主区域 -->
    <div class="main-wrapper">
      <header class="header">
        <div class="header-left">
          <button class="toggle-btn" @click="collapsed = !collapsed" title="折叠/展开菜单">☰</button>
          <div class="page-title">{{ pageTitle }}</div>
        </div>
        <div class="header-right">
          <div class="global-search">
            <span class="search-icon">🔍</span>
            <input v-model="kw" placeholder="全局搜索..." @keyup.enter="doSearch">
          </div>
          <!-- 审批通知收件箱（P3） -->
          <div class="notify" style="position:relative" @click.stop="toggleNotify">
            🔔<span class="badge" v-if="alerts">{{ alerts }}</span>
            <div class="notify-panel" v-if="showNotify">
              <div class="notify-head">
                <span>审批通知</span>
                <button class="btn btn-sm" @click.stop="markAllRead">全部已读</button>
              </div>
              <div class="notify-list">
                <div v-if="!notifyItems.length" class="notify-empty">暂无通知</div>
                <div v-for="n in notifyItems" :key="n.id" class="notify-item" :class="{ unread: !n.is_read }" @click.stop="openNotify(n)">
                  <div class="notify-title">{{ n.action_type ? '[' + n.action_type + '] ' : '' }}{{ n.title }}</div>
                  <div class="notify-content">{{ n.content }}</div>
                  <div class="notify-meta">{{ n.module }} · {{ n.source_user }} · {{ (n.created_at || '').slice(0, 16) }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="user-info" @click="showUserMenu = !showUserMenu">
            <div class="user-avatar">{{ (userName || 'A').slice(0, 1).toUpperCase() }}</div>
            <div class="user-name">{{ userName }}</div>
          </div>
          <button class="btn btn-sm" @click="logout">退出</button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { menuItems, moduleResource } from '../router'
import { auth, dashboard, notification } from '../api'

const router = useRouter()
const route = useRoute()
const collapsed = ref(window.innerWidth <= 768)
const kw = ref('')
const alerts = ref(0)
const showUserMenu = ref(false)
const userName = ref(localStorage.getItem('med_name') || 'admin')
const showNotify = ref(false)
const notifyItems = ref([])
let notifyTimer = null

// 窗口变化时自适应（移动端默认折叠，桌面端展开）
window.addEventListener('resize', () => {
  collapsed.value = window.innerWidth <= 768
})

const activeId = computed(() => {
  if (route.path === '/dashboard') return 'dashboard'
  return route.params.id || ''
})

const pageTitle = computed(() => {
  const m = menuItems.find(x => x.id === activeId.value)
  return m ? m.label : '智能工作台'
})

function navigate(id) {
  if (id === 'dashboard') router.push('/dashboard')
  else if (id === 'report') router.push('/report')
  else router.push('/module/' + id)
}

function doSearch() {
  if (kw.value.trim()) window.alert('搜索：' + kw.value)
}

async function logout() {
  try { await auth.logout() } catch (e) {}
  localStorage.clear()
  router.push('/login')
}

// ===== 审批通知（P3） =====
async function refreshUnread() {
  try {
    const d = await notification.unreadCount()
    alerts.value = d.count || 0
  } catch { /* 忽略 */ }
}
async function toggleNotify() {
  showNotify.value = !showNotify.value
  if (showNotify.value) {
    try { notifyItems.value = (await notification.list()) || [] } catch { notifyItems.value = [] }
  }
}
async function openNotify(n) {
  if (!n.is_read) {
    try { await notification.markRead(n.id); n.is_read = 1 } catch { /* 忽略 */ }
    refreshUnread()
  }
}
async function markAllRead() {
  try { await notification.markAllRead() } catch { /* 忽略 */ }
  notifyItems.value.forEach(n => { n.is_read = 1 })
  refreshUnread()
}
// 点击面板外关闭
function onDocClick() { showNotify.value = false }
onMounted(() => {
  document.addEventListener('click', onDocClick)
  refreshUnread()
  notifyTimer = setInterval(refreshUnread, 30000)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  if (notifyTimer) clearInterval(notifyTimer)
})
</script>

<style scoped>
.notify-panel {
  position: absolute; right: 0; top: 40px; z-index: 200;
  width: 360px; max-height: 420px; overflow: hidden;
  background: #fff; border: 1px solid #e4e7ed; border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0,0,0,.12);
}
.notify-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-weight: 600;
}
.notify-list { max-height: 360px; overflow-y: auto; }
.notify-empty { padding: 30px 0; text-align: center; color: #999; }
.notify-item { padding: 10px 14px; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.notify-item:hover { background: #f5f7fa; }
.notify-item.unread { background: #ecf5ff; }
.notify-item.unread .notify-title { font-weight: 600; }
.notify-title { font-size: 13px; color: #303133; }
.notify-content { font-size: 12px; color: #666; margin-top: 2px; }
.notify-meta { font-size: 11px; color: #999; margin-top: 4px; }
</style>
