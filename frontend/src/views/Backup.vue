<template>
  <div>
    <!-- 备份配置 + 操作 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">数据备份（SQLite 在线热备，不影响业务读写）</div>
        <button class="btn" @click="runBackup" :disabled="running">{{ running ? '备份中...' : '立即备份' }}</button>
      </div>
      <div class="info-row">
        <span>自动备份：<b :style="{ color: cfg.auto_enabled ? '#67c23a' : '#909399' }">{{ cfg.auto_enabled ? `开启（每 ${cfg.interval_hours} 小时）` : '关闭（BACKUP_INTERVAL_HOURS=0）' }}</b></span>
        <span>保留份数：<b>{{ cfg.keep }}</b></span>
        <span>备份目录：<code>{{ cfg.dir }}</code></span>
      </div>
    </div>

    <!-- 备份清单 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">备份记录（共 {{ list.length }} 份）</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>文件名</th><th>大小</th><th>类型</th><th>状态</th><th>操作人</th><th>时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="b in list" :key="b.id">
              <td>{{ b.file_name }}</td>
              <td>{{ b.size_mb }} MB</td>
              <td>{{ b.type === 'auto' ? '自动' : '手动' }}</td>
              <td>
                <span class="chip" :class="b.status === 'success' ? (b.exists ? 'c-green' : 'c-orange') : 'c-red'">
                  {{ b.status === 'success' ? (b.exists ? '成功' : '文件已清理') : '失败' }}
                </span>
              </td>
              <td>{{ b.created_by || '-' }}</td>
              <td>{{ b.created_at }}</td>
              <td>
                <button class="btn btn-sm" v-if="b.exists" @click="download(b)">下载</button>
                <button class="btn btn-sm btn-danger" @click="removeBackup(b)">删除</button>
              </td>
            </tr>
            <tr v-if="!list.length"><td colspan="7" style="text-align:center;color:#999;padding:24px">暂无备份，点击「立即备份」创建第一份</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 数据流转汇总（互联互通） -->
    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">数据互联互通 — 模块联动汇总</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>联动类型</th><th>次数</th><th>最近联动时间</th></tr></thead>
          <tbody>
            <tr v-for="t in bridgeTypes" :key="t.bridge_type">
              <td>{{ t.bridge_type }}</td><td>{{ t.c }}</td><td>{{ t.last_at || '-' }}</td>
            </tr>
            <tr v-if="!bridgeTypes.length"><td colspan="3" style="text-align:center;color:#999;padding:24px">暂无联动记录</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 最近联动明细 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">最近联动明细</div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>时间</th><th>类型</th><th>来源</th><th>目标</th><th>描述</th></tr></thead>
          <tbody>
            <tr v-for="r in bridgeRecent" :key="r.id">
              <td>{{ r.created_at }}</td><td>{{ r.bridge_type }}</td>
              <td>{{ r.source_module }} {{ r.source_ref }}</td>
              <td>{{ r.target_module }} {{ r.target_ref }}</td>
              <td>{{ r.description }}</td>
            </tr>
            <tr v-if="!bridgeRecent.length"><td colspan="5" style="text-align:center;color:#999;padding:24px">暂无数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { backupApi, bridgeApi } from '../api'

const list = ref([])
const cfg = ref({})
const running = ref(false)
const bridgeTypes = ref([])
const bridgeRecent = ref([])

async function load() {
  try {
    const d = await backupApi.list()
    list.value = d.list || []
    cfg.value = d.config || {}
  } catch (e) { window.alert('加载失败：' + e.message) }
}
async function loadBridge() {
  try {
    const d = await bridgeApi.dataFlowSummary()
    bridgeTypes.value = d.by_type || []
    bridgeRecent.value = d.recent || []
  } catch { /* 忽略 */ }
}
async function runBackup() {
  running.value = true
  try {
    await backupApi.run()
    await load()
  } catch (e) { window.alert(e.message) } finally { running.value = false }
}
async function download(b) {
  try { await backupApi.downloadFile(b.id, b.file_name) } catch (e) { window.alert('下载失败：' + e.message) }
}
async function removeBackup(b) {
  if (!window.confirm(`确认删除备份 ${b.file_name}？文件将一并删除`)) return
  try { await backupApi.remove(b.id); await load() } catch (e) { window.alert(e.message) }
}

onMounted(() => { load(); loadBridge() })
</script>

<style scoped>
.card { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 12px; }
.info-row { display: flex; gap: 28px; padding: 10px 4px; font-size: 13px; color: #606266; flex-wrap: wrap; }
.info-row code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.c-green { background: #f0f9eb; color: #67c23a; }
.c-orange { background: #fdf6ec; color: #e6a23c; }
.c-red { background: #fef0f0; color: #f56c6c; }
.btn-danger { color: #f56c6c; border-color: #f56c6c; background: #fff; }
</style>
