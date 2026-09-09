import axios from 'axios';
import router from '../router';

// baseURL 跟随 vite base：子路径构建（BASE_PATH=/yl/）时所有 /api 请求自动带 /yl 前缀
// axios 的 combineURLs 会把 baseURL 与请求路径拼接，'/' 开头的 url 不会覆盖 baseURL 的路径部分
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') // '/yl/' -> '/yl'；'/' -> ''
const http = axios.create({ baseURL: BASE, timeout: 20000 });

// token key 统一（前后端对齐到 zmyl_*，前端 localStorage 名）
export const TOKEN_KEY = 'zmyl_token';

http.interceptors.request.use(cfg => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg
});

http.interceptors.response.use(
  res => {
    const d = res.data;
    // 兼容两套响应格式：{code, msg, data}（旧）和 {success, data, message}（新）
    if (d && d.code !== undefined && d.code !== 0 && d.code !== 200) {
      return Promise.reject(new Error(d.msg || d.message || '请求失败'));
    }
    if (d && d.success === false) {
      return Promise.reject(new Error(d.message || '请求失败'));
    }
    return d && d.data !== undefined ? d.data : d;
  },
  err => {
    if (err.response && err.response.status === 401) {
      localStorage.clear();
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login');
      }
      return Promise.reject(new Error('未登录或登录已过期'));
    }
    const body = err.response && err.response.data;
    const msg = body && (body.message || body.msg || body.error) || err.message;
    return Promise.reject(new Error(msg));
  }
)

export const auth = {
  login: (username, password) =>
    http.post('/api/auth/login', { username, password }),
  logout: () => http.post('/api/auth/logout'),
  me: () => http.get('/api/auth/me'),
  changePassword: (oldPassword, newPassword) =>
    http.post('/api/auth/change-password', { oldPassword, newPassword }),
}

export const user = {
  listRoles: () => http.get('/api/user/roles/all'),
  list: (params) => http.get('/api/user', { params }),
  create: (data) => http.post('/api/user', data),
  update: (id, data) => http.put('/api/user/' + id, data),
  remove: (id) => http.delete('/api/user/' + id),
  resetPassword: (id, newPassword) => http.put(`/api/user/${id}/reset-password`, { newPassword }),
}

export const dashboard = () => http.get('/api/dashboard')

export const crud = {
  list: (resource, params) => http.get(`/api/${resource}`, { params }),
  get: (resource, id) => http.get(`/api/${resource}/` + id),
  create: (resource, data) => http.post(`/api/${resource}`, data),
  update: (resource, id, data) => http.put('/api/' + resource + '/' + id, data),
  remove: (resource, id) => http.delete('/api/' + resource + '/' + id),
}

// ===== 工作流操作 =====
export const workflow = {
  // 两级审批（供应商/客户/人员/健康/培训/首营/企业资质）: 待审核 -> 已审核 -> 已批准
  review: (resource, id, action, opinion) =>
    http.put(`/api/${resource}/` + id + '/review', { action, opinion }),
  approve: (resource, id, action, opinion) =>
    http.put(`/api/${resource}/` + id + '/approve', { action, opinion }),
  // 采购计划单级审批 + 转采购执行单
  reviewPlan: (id, action, opinion) =>
    http.post('/api/purchase_plan/' + id + '/review', { action, opinion }),
  convertPlan: (id) =>
    http.post('/api/purchase_plan/' + id + '/convert-to-procurement', {}),
  // 采购入库五步流: 待验收->待质管审核->待库管确认->待负责人批准->已入库
  procFlow: (resource, id, step, action) =>
    http.post('/api/' + resource + '/' + id + '/' + step, { action }),
  // 销售出库六级流（P3）: 待销售经理审核->质管员->库管员->质量负责人->销售总监->已出库
  outboundFlow: (id, action, opinion) =>
    http.post('/api/outbound_record/' + id + '/flow', { action, opinion }),
  outboundPrint: (id) => http.post('/api/outbound_record/' + id + '/print', {}),
  // 产品验收五步流（P3）: 待验收->外观检查->数量核对->质量检验->综合判定
  paStep: (id, payload) => http.post('/api/product_acceptance/' + id + '/workflow-step', payload),
  paReset: (id) => http.post('/api/product_acceptance/' + id + '/workflow-reset', {}),
}

// ===== 审批通知收件箱（P3） =====
export const notification = {
  list: () => http.get('/api/notifications'),
  unreadCount: () => http.get('/api/notifications/unread-count'),
  markRead: (id) => http.put('/api/notifications/' + id + '/read'),
  markAllRead: () => http.put('/api/notifications/read-all'),
}

// ===== 报表中心（P3） =====
export const report = {
  listTypes: () => http.get('/api/reports'),
  summary: () => http.get('/api/reports/summary'),
  // 导出 Excel（blob 触发浏览器下载）
  async exportFile(type) {
    const blob = await http.get('/api/reports/export/' + type, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

// ===== 验收资料 PDF（P3） =====
export const fileApi = {
  uploadDoc: (formData) =>
    http.post('/api/acceptance_doc', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listDocs: (params) => http.get('/api/acceptance_doc', { params }),
  removeDoc: (id) => http.delete('/api/acceptance_doc/' + id),
  // 浏览器直接打开（iframe/新窗口用，token 走查询参数）；带 base 前缀以兼容子路径部署
  docUrl: (id) => `${BASE}/api/acceptance_doc/${id}/file?token=${encodeURIComponent(localStorage.getItem(TOKEN_KEY) || '')}`,
}

// ===== 可配置审批流（P4） =====
export const flowApi = {
  meta: () => http.get('/api/approval-flows/meta'),
  list: (params) => http.get('/api/approval-flows', { params }),
  get: (id) => http.get('/api/approval-flows/' + id),
  create: (data) => http.post('/api/approval-flows', data),
  update: (id, data) => http.put('/api/approval-flows/' + id, data),
  remove: (id) => http.delete('/api/approval-flows/' + id),
  submit: (id) => http.post('/api/approval-flows/' + id + '/submit', {}),
  approve: (id, action, opinion) => http.post('/api/approval-flows/' + id + '/approve', { action, opinion }),
  disable: (id) => http.post('/api/approval-flows/' + id + '/disable', {}),
  newVersion: (id) => http.post('/api/approval-flows/' + id + '/new-version', {}),
  active: () => http.get('/api/approval-flows/active'),
  versions: (id) => http.get('/api/approval-flows/' + id + '/versions'),
  logs: (id) => http.get('/api/approval-flows/' + id + '/logs'),
  hooks: () => http.get('/api/approval-flows/hooks'),
}

// ===== 冷链管理（P4） =====
export const coldChain = {
  dashboard: () => http.get('/api/cold-chain/dashboard'),
  chainTrace: (params) => http.get('/api/cold-chain/chain-trace', { params }),
  listDevices: (params) => http.get('/api/cold-chain/devices', { params }),
  createDevice: (data) => http.post('/api/cold-chain/devices', data),
  updateDevice: (id, data) => http.put('/api/cold-chain/devices/' + id, data),
  removeDevice: (id) => http.delete('/api/cold-chain/devices/' + id),
  listRecords: (params) => http.get('/api/cold-chain/records', { params }),
  createRecord: (data) => http.post('/api/cold-chain/records', data),
  batchRecords: (data) => http.post('/api/cold-chain/records/batch', data),
  listAlarms: (params) => http.get('/api/cold-chain/alarms', { params }),
  alarmStats: () => http.get('/api/cold-chain/alarms/stats'),
  handleAlarm: (id, data) => http.post('/api/cold-chain/alarms/' + id + '/handle', data),
  scanOffline: () => http.post('/api/cold-chain/alarms/scan-offline', {}),
  listLedgers: () => http.get('/api/cold-chain/ledgers'),
  getLedger: (id) => http.get('/api/cold-chain/ledgers/' + id),
  generateLedger: (data) => http.post('/api/cold-chain/ledgers/generate', data),
  verifyLedger: (id) => http.post('/api/cold-chain/ledgers/' + id + '/verify', {}),
}

// ===== 物流追踪（P4） =====
export const logistics = {
  dashboard: () => http.get('/api/logistics/dashboard'),
  trace: (logisticsNo) => http.get('/api/logistics/trace', { params: { logistics_no: logisticsNo } }),
  listCarriers: () => http.get('/api/logistics/carriers'),
  createCarrier: (data) => http.post('/api/logistics/carriers', data),
  updateCarrier: (id, data) => http.put('/api/logistics/carriers/' + id, data),
  removeCarrier: (id) => http.delete('/api/logistics/carriers/' + id),
  listOrders: (params) => http.get('/api/logistics/orders', { params }),
  createOrder: (data) => http.post('/api/logistics/orders', data),
  getOrder: (id) => http.get('/api/logistics/orders/' + id),
  updateOrder: (id, data) => http.put('/api/logistics/orders/' + id, data),
  removeOrder: (id) => http.delete('/api/logistics/orders/' + id),
  addNode: (id, data) => http.post('/api/logistics/orders/' + id + '/nodes', data),
  removeNode: (id, nid) => http.delete('/api/logistics/orders/' + id + '/nodes/' + nid),
  markException: (id, remark) => http.post('/api/logistics/orders/' + id + '/exception', { remark }),
}

// ===== 数据互联互通（P4） =====
export const bridgeApi = {
  pendingApprovals: () => http.get('/api/bridge/pending-approvals'),
  dataFlowSummary: () => http.get('/api/bridge/data-flow-summary'),
  inventoryOptions: () => http.get('/api/bridge/inventory-options'),
  supplierOptions: () => http.get('/api/bridge/supplier-options'),
  customerOptions: () => http.get('/api/bridge/customer-options'),
}

// ===== 数据备份（P4） =====
export const backupApi = {
  list: () => http.get('/api/backup'),
  run: () => http.post('/api/backup/run', {}),
  remove: (id) => http.delete('/api/backup/' + id),
  async downloadFile(id, fileName) {
    const blob = await http.get('/api/backup/' + id + '/download', { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || `backup_${id}.db`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export default http