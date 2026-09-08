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
          <div class="notify" title="通知">🔔<span class="badge" v-if="alerts">{{ alerts }}</span></div>
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
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { menuItems, moduleResource } from '../router'
import { auth, dashboard } from '../api'

const router = useRouter()
const route = useRoute()
const collapsed = ref(window.innerWidth <= 768)
const kw = ref('')
const alerts = ref(0)
const showUserMenu = ref(false)
const userName = ref(localStorage.getItem('med_name') || 'admin')

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

// 加载告警数（效期+待维修等）
dashboard().then(s => {
  alerts.value = (s.expiring || 0) + (s.pending_repairs || 0)
}).catch(() => {})
</script>
