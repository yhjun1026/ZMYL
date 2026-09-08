import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import MainLayout from '../views/MainLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import ModulePage from '../views/ModulePage.vue'
import Report from '../views/Report.vue'

// 原版菜单一比一还原（menu.js 的 menuItems）
export const menuItems = [
  { id:'dashboard', label:'智能工作台', icon:'📊', group:'工作台' },
  { id:'sep-gsp1', label:'-- 首营管理 --', sep:true, group:'首营管理' },
  { id:'first-factory', label:'首营生产企业资质审核', icon:'🏭', gsp:'GSP第61-63条' },
  { id:'first-product', label:'首营品种资质审核', icon:'🔬', gsp:'GSP第64-66条' },
  { id:'supplier', label:'供货单位档案管理', icon:'🏢', gsp:'GSP第28条' },
  { id:'cert-expiry', label:'资质证件效期管理', icon:'🔔', gsp:'GSP第28条' },
  { id:'sep-gsp2', label:'-- 采购验收 --', sep:true, group:'采购验收' },
  { id:'purchase-plan', label:'采购计划与审批', icon:'📋', gsp:'GSP第33-38条' },
  { id:'procurement', label:'采购入库验收', icon:'📦', gsp:'GSP第39-45条' },
  { id:'accept-cure', label:'在库养护管理', icon:'🌡️', gsp:'GSP第54-58条' },
  { id:'product-acceptance', label:'到货产品验收记录', icon:'✅', gsp:'GSP第39-45条' },
  { id:'sep-gsp3', label:'-- 资产与仓储 --', sep:true, group:'资产与仓储' },
  { id:'equip-manage', label:'医疗器械台账管理', icon:'⚙️', gsp:'GSP第46条' },
  { id:'inventory', label:'库存台账管理', icon:'🗄️', gsp:'GSP第46-53条' },
  { id:'expiry-warn', label:'效期预警管理', icon:'⏰', gsp:'GSP第68-72条' },
  { id:'maintenance', label:'维修保养管理', icon:'🔧', gsp:'GSP第54条' },
  { id:'calibration', label:'计量器具校准管理', icon:'📐', gsp:'GSP第54条' },
  { id:'sep-gsp4', label:'-- 销售出库 --', sep:true, group:'销售出库' },
  { id:'customer-archive', label:'购货单位档案管理', icon:'👤', gsp:'GSP第59条' },
  { id:'outbound', label:'销售出库管理', icon:'📤', gsp:'GSP第59-67条' },
  { id:'sep-gsp5', label:'-- 质量监控 --', sep:true, group:'质量监控' },
  { id:'adverse-event', label:'不良事件监测报告', icon:'⚠️', gsp:'不良事件办法' },
  { id:'trace-recall', label:'产品追溯与召回', icon:'↩️', gsp:'召回管理办法' },
  { id:'standard', label:'强制性标准管理', icon:'📏', gsp:'标准管理办法' },
  { id:'sep-gsp6', label:'-- 档案管理 --', sep:true, group:'档案管理' },
  { id:'personnel', label:'人员资质档案管理', icon:'👥', gsp:'GSP第18-20条' },
  { id:'health-archive', label:'从业人员健康档案', icon:'💚', gsp:'GSP第18条' },
  { id:'training', label:'员工培训档案管理', icon:'🎓', gsp:'GSP第20条' },
  { id:'sep-gsp7', label:'-- 综合管理 --', sep:true, group:'综合管理' },
  { id:'system-profile', label:'经营企业资质档案', icon:'🏢', gsp:'GSP第8-10条' },
  { id:'finance', label:'财务经营统计', icon:'💰' },
  { id:'report', label:'综合统计报表', icon:'📈' },
  { id:'ops-flow', label:'标准操作规程(SOP)', icon:'📜', gsp:'质量管理体系' },
  { id:'operation-log', label:'系统操作审计日志', icon:'📝', gsp:'GSP审计追溯' },
  { id:'permission', label:'角色权限管理', icon:'🔐' },
  { id:'settings', label:'系统参数设置', icon:'⚙️' },
]

// 模块ID -> 后端resource映射（对接 /api/<resource>，均为单数蛇形）
export const moduleResource = {
  'first-factory': 'first_factory_audit',
  'first-product': 'first_product_audit',
  'supplier': 'supplier',
  'purchase-plan': 'purchase_plan',
  'procurement': 'proc_equipment',
  'accept-cure': 'temp_humidity_log',
  'product-acceptance': 'product_acceptance',
  'equip-manage': 'equip_ledger',
  'inventory': 'inventory',
  'expiry-warn': 'expiry_warning',
  'maintenance': 'repair_order',
  'calibration': 'calibration_plan',
  'customer-archive': 'customer_archive',
  'outbound': 'outbound_record',
  'adverse-event': 'adverse_event',
  'trace-recall': 'recall_record',
  'standard': 'national_standard',
  'personnel': 'personnel',
  'health-archive': 'health_record',
  'training': 'training_plan',
  'system-profile': 'system_profile',
  'operation-log': 'operation_log',
  'cert-expiry': 'cert_update_request',
  'finance': 'finance_record',
  'ops-flow': 'knowledge_base',
  'permission': 'user',
}

const routes = [
  { path: '/login', component: Login },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: Dashboard, meta: { title: '智能工作台' } },
      { path: 'report', component: Report, meta: { title: '综合统计报表' } },
      { path: 'module/:id', component: ModulePage },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  // token key 对齐到 zmyl_token（后端响应 + stores/auth.js）
  const token = localStorage.getItem('zmyl_token') || localStorage.getItem('med_token');
  if (token && !localStorage.getItem('zmyl_token')) {
    localStorage.setItem('zmyl_token', token);
    localStorage.removeItem('med_token');
  }
  if (to.path !== '/login' && !token) return '/login';
  if (to.path === '/login' && localStorage.getItem('zmyl_token')) return '/dashboard';
})

export default router
