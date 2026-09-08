<template>
  <div class="tech-dashboard" v-if="stats">
    <!-- 科技感顶部横幅（原版一比一） -->
    <div class="tech-hero">
      <div class="tech-hero-content">
        <div class="tech-hero-left">
          <div class="tech-hero-logo">🏥</div>
          <div>
            <div class="tech-hero-title">医疗器械智能管理平台</div>
            <div class="tech-hero-subtitle">GSP合规 · 智能质控 · 全流程追溯</div>
          </div>
        </div>
        <div class="tech-hero-right">
          <div style="text-align:right">
            <div class="tech-clock">{{ timeStr }}</div>
            <div class="tech-date">{{ dateStr }}</div>
          </div>
          <div class="tech-status-pill"><span class="pulse"></span>系统运行正常</div>
        </div>
      </div>
    </div>

    <!-- 核心统计卡片（原版12张一比一） -->
    <div class="tech-stats">
      <div class="tech-stat-card blue" @click="go('/module/equip-manage')">
        <div class="tech-stat-top"><div class="tech-stat-icon">🏥</div><span class="tech-stat-trend up">+2</span></div>
        <div class="tech-stat-value">{{ stats.total_devices }}</div>
        <div class="tech-stat-label">器械总数</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" :style="{width: pct(stats.total_devices, 50) }"></div></div>
      </div>
      <div class="tech-stat-card teal" @click="go('/module/equip-manage')">
        <div class="tech-stat-top"><div class="tech-stat-icon">✅</div><span class="tech-stat-trend flat">--</span></div>
        <div class="tech-stat-value">{{ stats.in_use }}</div>
        <div class="tech-stat-label">在用器械</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" :style="{width: pct(stats.in_use, equipTotal) }"></div></div>
      </div>
      <div class="tech-stat-card warn" @click="go('/module/expiry-warn')">
        <div class="tech-stat-top"><div class="tech-stat-icon">⏰</div><span class="tech-stat-trend down">{{ stats.expiring||0 }}项</span></div>
        <div class="tech-stat-value">{{ stats.expiring||0 }}</div>
        <div class="tech-stat-label">效期预警</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" :style="{width: pct(stats.expiring||0, 10) }"></div></div>
      </div>
      <div class="tech-stat-card danger" @click="go('/module/maintenance')">
        <div class="tech-stat-top"><div class="tech-stat-icon">🔧</div><span class="tech-stat-trend down">待处理</span></div>
        <div class="tech-stat-value">{{ stats.pending_repairs }}</div>
        <div class="tech-stat-label">待维修工单</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" :style="{width: pct(stats.pending_repairs, 5) }"></div></div>
      </div>
      <div class="tech-stat-card warn" @click="go('/module/adverse-event')">
        <div class="tech-stat-top"><div class="tech-stat-icon">⚠️</div><span class="tech-stat-trend down">待查</span></div>
        <div class="tech-stat-value">{{ stats.pending_adverse }}</div>
        <div class="tech-stat-label">不良事件待查</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" :style="{width: pct(stats.pending_adverse, 3) }"></div></div>
      </div>
      <div class="tech-stat-card teal" @click="go('/module/trace-recall')">
        <div class="tech-stat-top"><div class="tech-stat-icon">↩️</div><span class="tech-stat-trend flat">--</span></div>
        <div class="tech-stat-value">{{ stats.pending_recall }}</div>
        <div class="tech-stat-label">追溯召回执行中</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" :style="{width: pct(stats.pending_recall, 2) }"></div></div>
      </div>
      <div class="tech-stat-card purple" @click="go('/module/purchase-plan')">
        <div class="tech-stat-top"><div class="tech-stat-icon">📋</div><span class="tech-stat-trend down">待批</span></div>
        <div class="tech-stat-value">{{ stats.pending_plans||0 }}</div>
        <div class="tech-stat-label">采购计划待审批</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" :style="{width: pct(stats.pending_plans||0, 5) }"></div></div>
      </div>
      <div class="tech-stat-card danger" @click="go('/module/inventory')">
        <div class="tech-stat-top"><div class="tech-stat-icon">📦</div><span class="tech-stat-trend down">不足</span></div>
        <div class="tech-stat-value">{{ stats.low_stock||0 }}</div>
        <div class="tech-stat-label">库存预警</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" :style="{width: pct(stats.low_stock||0, 5) }"></div></div>
      </div>
      <div class="tech-stat-card blue" @click="go('/module/inventory')">
        <div class="tech-stat-top"><div class="tech-stat-icon">📊</div><span class="tech-stat-trend up">正常</span></div>
        <div class="tech-stat-value">{{ stats.total_inventory_qty||0 }}</div>
        <div class="tech-stat-label">库存总量</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" style="width:75%"></div></div>
      </div>
      <div class="tech-stat-card teal" @click="go('/module/outbound')">
        <div class="tech-stat-top"><div class="tech-stat-icon">📤</div><span class="tech-stat-trend up">今日</span></div>
        <div class="tech-stat-value">¥{{ money(stats.today_outbound||0) }}</div>
        <div class="tech-stat-label">今日销售出库额</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" style="width:60%"></div></div>
      </div>
      <div class="tech-stat-card blue" @click="go('/module/personnel')">
        <div class="tech-stat-top"><div class="tech-stat-icon">👥</div><span class="tech-stat-trend flat">--</span></div>
        <div class="tech-stat-value">{{ stats.total_personnel||0 }}</div>
        <div class="tech-stat-label">在岗人员</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" style="width:85%"></div></div>
      </div>
      <div class="tech-stat-card danger" @click="go('/module/cert-expiry')">
        <div class="tech-stat-top"><div class="tech-stat-icon">🔔</div><span class="tech-stat-trend down">{{ stats.cert_expired||0 }}过期</span></div>
        <div class="tech-stat-value">{{ (stats.cert_expiring||0)+(stats.cert_expired||0) }}</div>
        <div class="tech-stat-label">资质证件预警</div>
        <div class="tech-stat-bar"><div class="tech-stat-bar-fill" :style="{width: pct((stats.cert_expiring||0)+(stats.cert_expired||0), 5) }"></div></div>
      </div>
    </div>

    <!-- 待办与动态 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      <div class="tech-panel">
        <div class="tech-panel-header"><div class="tech-panel-title"><span class="dot"></span>待办事项</div></div>
        <div class="tech-panel-body">
          <div class="tech-todo-item" v-for="t in todos" :key="t.text" @click="go(t.path)">
            <div class="tech-todo-dot" :class="t.level"></div>
            <div class="tech-todo-text">{{ t.text }}</div>
            <span class="tech-todo-tag" :class="t.level">{{ t.level === 'urgent' ? '紧急' : '常规' }}</span>
          </div>
          <div v-if="!todos.length" style="color:var(--text-muted);text-align:center;padding:20px">暂无待办事项</div>
        </div>
      </div>
      <div class="tech-panel">
        <div class="tech-panel-header"><div class="tech-panel-title"><span class="dot"></span>最近动态</div></div>
        <div class="tech-panel-body">
          <div class="tech-log-item" v-for="(l, i) in logs" :key="i">
            <div class="tech-log-dot" :style="{background: ['#1e6fb8','#1aa690','#f39c12','#e74c3c','#8e44ad'][i%5]}"></div>
            <div>
              <div class="tech-log-text">{{ l.content }}</div>
              <div class="tech-log-meta"><span>{{ l.user }}</span><span>{{ l.time }}</span></div>
            </div>
          </div>
          <div v-if="!logs.length" style="color:var(--text-muted);text-align:center;padding:20px">暂无动态</div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading-text"><div class="loading-spinner"></div><div class="loading-label">正在加载工作台...</div></div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dashboard, crud } from '../api'

const router = useRouter()
const stats = ref(null)
const logs = ref([])
const timeStr = ref('')
const dateStr = ref('')

const equipTotal = computed(() => ((stats.value.in_use||0)+(stats.value.in_repair||0)+(stats.value.scrapped||0)) || 1)

const todos = computed(() => {
  const s = stats.value || {}
  const list = []
  if (s.expiring) list.push({ text: `有 ${s.expiring} 项效期预警需要处理`, level: 'urgent', path: '/module/expiry-warn' })
  if (s.pending_repairs) list.push({ text: `有 ${s.pending_repairs} 条待维修工单`, level: 'urgent', path: '/module/maintenance' })
  if (s.pending_adverse) list.push({ text: `有 ${s.pending_adverse} 起不良事件待调查`, level: 'urgent', path: '/module/adverse-event' })
  if (s.pending_plans) list.push({ text: `有 ${s.pending_plans} 个采购计划待审批`, level: 'normal', path: '/module/purchase-plan' })
  return list
})

function pct(v, total) { return Math.min((v||0)/(total||1)*100, 100).toFixed(0) + '%' }
function money(v) { return (v||0).toLocaleString('zh-CN', {minimumFractionDigits: 2}) }
function go(p) { router.push(p) }

function tick() {
  const now = new Date()
  timeStr.value = now.toTimeString().slice(0,8)
  dateStr.value = now.toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long'})
}

onMounted(async () => {
  tick(); setInterval(tick, 1000)
  try {
    stats.value = await dashboard()
  } catch (e) { console.error(e) }
  try {
    const d = await crud.list('operation_logs', { page: 1, size: 8 })
    logs.value = (d.items || d || []).slice(0, 8).map(x => ({
      content: (x.action || x.description || '操作') + (x.detail ? ' - ' + x.detail : ''),
      user: x.username || x.operator || '系统',
      time: (x.created_at || '').replace('T', ' ').slice(0, 16)
    }))
  } catch (e) {}
})
</script>
