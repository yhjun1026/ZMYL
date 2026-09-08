<template>
  <div>
    <!-- 汇总卡片 -->
    <div class="stat-grid">
      <div class="stat-card" v-for="s in statCards" :key="s.label">
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-value">{{ s.value }}</div>
      </div>
    </div>

    <!-- 月度趋势表 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <div class="card-title">近 6 个月经营趋势</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>月份</th><th>采购金额(元)</th><th>销售金额(元)</th><th>财务收入(元)</th><th>财务支出(元)</th><th>净额(元)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in monthly" :key="m.month">
              <td>{{ m.month }}</td>
              <td>{{ m['采购金额'] }}</td>
              <td>{{ m['销售金额'] }}</td>
              <td>{{ m['财务收入'] }}</td>
              <td>{{ m['财务支出'] }}</td>
              <td :style="{ color: (m['财务收入'] - m['财务支出']) >= 0 ? '#e6a23c' : '#f56c6c' }">
                {{ m['财务收入'] - m['财务支出'] }}
              </td>
            </tr>
            <tr v-if="!monthly.length && !loading">
              <td colspan="6" style="text-align:center;color:#999;padding:24px">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 导出中心 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <div class="card-title">报表导出（Excel）</div>
      </div>
      <div class="export-grid">
        <button class="btn btn-outline" v-for="r in reportTypes" :key="r.type" @click="doExport(r.type)">
          ⬇ {{ r.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { report } from '../api'

const loading = ref(false)
const totals = ref({})
const monthly = ref([])
const reportTypes = ref([])

const statCards = computed(() => Object.entries(totals.value).map(([label, value]) => ({ label, value })))

async function load() {
  loading.value = true
  try {
    const s = await report.summary()
    totals.value = s.totals || {}
    monthly.value = s.monthly || []
  } catch (e) {
    window.alert('加载统计失败：' + e.message)
  } finally { loading.value = false }
}

async function loadTypes() {
  try { reportTypes.value = (await report.listTypes()) || [] } catch { reportTypes.value = [] }
}

async function doExport(type) {
  try {
    await report.exportFile(type)
  } catch (e) {
    window.alert('导出失败：' + e.message)
  }
}

onMounted(() => { load(); loadTypes() })
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.stat-card {
  background: #fff; border: 1px solid #ebeef5; border-radius: 8px;
  padding: 16px;
}
.stat-label { font-size: 13px; color: #909399; }
.stat-value { font-size: 26px; font-weight: 700; color: #303133; margin-top: 6px; }
.export-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  padding: 4px;
}
</style>
