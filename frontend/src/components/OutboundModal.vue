<template>
  <div class="modal-overlay" :class="{ show: true }">
    <div class="modal" style="max-width:860px;width:96%">
      <div class="modal-header">
        <div class="modal-title">{{ editRow ? '编辑出库单' : '新建出库单' }}（GSP合规）</div>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <div class="hint-bar">💡 客户名称 / 设备名称 / 生产厂家 支持联想：输入关键字从档案库选择后自动带出证照信息，无需手填</div>

        <div class="form-row">
          <div class="form-group"><label>出库单号</label>
            <input v-model="form.order_no" readonly class="ro" :placeholder="editRow ? '' : '系统自动生成'"></div>
          <div class="form-group"><label>客户名称 *</label>
            <input v-model="form.customer" list="dl-customers" placeholder="输入客户名称联想购货单位档案" @change="pickCustomer">
            <datalist id="dl-customers">
              <option v-for="c in customers" :key="c.id" :value="c.name">{{ c.license || c.code || '' }}</option>
            </datalist>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>客户许可证</label><input v-model="form.customer_license" placeholder="选择客户后自动带出"></div>
          <div class="form-group"><label>日期</label><input v-model="form.date" type="date"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>设备名称（联动库存商品）*</label>
            <input v-model="form.equip_name" list="dl-inventory" placeholder="输入名称/规格/批号联想库存" @change="pickInventory">
            <datalist id="dl-inventory">
              <option v-for="i in inventories" :key="i.id" :value="i.name">{{ i.spec || '' }}｜批号:{{ i.batch || '-' }}｜库存:{{ i.qty }}{{ i.unit || '' }}</option>
            </datalist>
          </div>
          <div class="form-group"><label>UDI</label><input v-model="form.equip_udi" placeholder="选择商品后自动带出"></div>
        </div>
        <div v-if="stockHint" class="stock-hint">{{ stockHint }}</div>
        <div class="form-row">
          <div class="form-group"><label>批号</label><input v-model="form.batch"></div>
          <div class="form-group"><label>注册证号</label><input v-model="form.reg_cert"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>生产厂家（联动首营企业库）</label>
            <input v-model="form.factory_name" list="dl-factories" placeholder="输入厂家名称联想首营生产企业" @change="pickFactory">
            <datalist id="dl-factories">
              <option v-for="f in factories" :key="f.id" :value="f.name">{{ f.license || '' }}</option>
            </datalist>
          </div>
          <div class="form-group"><label>生产许可证号</label><input v-model="form.prod_license_no" placeholder="选择厂家后自动带出"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>供应商（联动供货单位档案）</label>
            <input v-model="form.supplier" list="dl-suppliers" placeholder="输入供应商名称联想">
            <datalist id="dl-suppliers">
              <option v-for="s in suppliers" :key="s.id" :value="s.name">{{ s.med_biz_license_no || '' }}</option>
            </datalist>
          </div>
          <div class="form-group"><label>经销商</label><input v-model="form.dealer" list="dl-suppliers" placeholder="可联想供货单位档案"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>数量 *</label><input v-model.number="form.qty" type="number" min="1" @input="calcTotal"></div>
          <div class="form-group"><label>单位</label><input v-model="form.unit" placeholder="台 / 盒 / 支"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>单价(元)</label><input v-model.number="form.price" type="number" step="0.01" @input="calcTotal"></div>
          <div class="form-group"><label>总金额(元)</label><input v-model.number="form.total" type="number" step="0.01" readonly class="ro"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>生产日期</label><input v-model="form.prod_date" type="date"></div>
          <div class="form-group"><label>有效期至</label><input v-model="form.expire_date" type="date"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>制单人</label><input v-model="form.operator"></div>
          <div class="form-group"><label>收货人</label><input v-model="form.recipient"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>运输条件</label><input v-model="form.transport_condition" placeholder="常温 / 冷链"></div>
          <div class="form-group"><label>储存条件</label><input v-model="form.storage_condition" placeholder="常温干燥 / 2-8℃冷藏"></div>
        </div>
        <div class="form-group"><label>备注</label><input v-model="form.note"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" style="background:#f0f2f5" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { crud } from '../api'

const props = defineProps({ editRow: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const customers = ref([])
const inventories = ref([])
const suppliers = ref([])
const factories = ref([])
const saving = ref(false)
const stockHint = ref('')

const today = new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 10)
const form = reactive({
  order_no: '', customer: '', customer_license: '', date: today,
  equip_name: '', equip_udi: '', batch: '', reg_cert: '',
  factory_name: '', prod_license_no: '', supplier: '', dealer: '',
  qty: 1, unit: '', price: 0, total: 0,
  prod_date: '', expire_date: '', operator: '', recipient: '',
  transport_condition: '常温', storage_condition: '常温干燥', note: '',
})

if (props.editRow) {
  Object.keys(form).forEach((k) => {
    if (props.editRow[k] !== undefined && props.editRow[k] !== null) form[k] = props.editRow[k]
  })
}

function pickCustomer() {
  const c = customers.value.find((x) => x.name === form.customer)
  if (c) form.customer_license = c.license || ''
}
function pickInventory() {
  stockHint.value = ''
  const i = inventories.value.find((x) => x.name === form.equip_name)
  if (!i) return
  form.equip_udi = i.udi || ''
  form.batch = i.batch || ''
  form.unit = i.unit || form.unit || '台'
  form.factory_name = i.manufacturer || form.factory_name
  stockHint.value = `📦 库存联动：${i.name}${i.spec ? '（' + i.spec + '）' : ''} 当前库存 ${i.qty}${i.unit || ''}，存放位 ${i.location || '-'}`
}
function pickFactory() {
  const f = factories.value.find((x) => x.name === form.factory_name)
  if (f) form.prod_license_no = f.license || ''
}
function calcTotal() {
  form.total = Math.round((form.qty || 0) * (form.price || 0) * 100) / 100
}

async function save() {
  if (!form.customer) { window.alert('请填写客户名称'); return }
  if (!form.equip_name) { window.alert('请填写设备名称'); return }
  saving.value = true
  try {
    const payload = { ...form }
    if (props.editRow) await crud.update('outbound_record', props.editRow.id, payload)
    else await crud.create('outbound_record', payload)
    window.alert(props.editRow ? '出库单已更新' : '出库单已创建')
    emit('close')
    emit('saved')
  } catch (e) { window.alert('保存失败：' + e.message) }
  finally { saving.value = false }
}

onMounted(async () => {
  // 三路档案并行加载（各取前 200 条供联想）
  const safe = (p) => p.then((d) => d.records || d.items || d.list || []).catch(() => [])
  const [cs, inv, sup, fac] = await Promise.all([
    safe(crud.list('customer_archive', { page: 1, size: 200 })),
    safe(crud.list('inventory', { page: 1, size: 200 })),
    safe(crud.list('supplier', { page: 1, size: 200 })),
    safe(crud.list('first_factory_audit', { page: 1, size: 200 })),
  ])
  customers.value = cs
  inventories.value = inv
  suppliers.value = sup
  factories.value = fac
})
</script>

<style scoped>
.hint-bar {
  padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 12px;
  background: #e8f1fb; color: #1e6fb8;
}
.ro { background: #f0f2f5; color: #888; }
.stock-hint {
  padding: 6px 10px; border-radius: 6px; font-size: 13px; margin-bottom: 8px;
  background: #e8f5e9; color: #27ae60;
}
.form-group label { display: block; font-size: 13px; color: var(--text, #2c3e50); margin-bottom: 6px; font-weight: 500; }
.form-group input {
  width: 100%; padding: 9px 12px; border: 1px solid #e4e8ee; border-radius: 8px; font-size: 14px; outline: none;
}
.form-group input:focus { border-color: #1e6fb8; }
</style>
