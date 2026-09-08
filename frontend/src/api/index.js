import axios from 'axios';
import router from '../router';

const http = axios.create({ baseURL: '', timeout: 20000 });

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
  // 浏览器直接打开（iframe/新窗口用，token 走查询参数）
  docUrl: (id) => `/api/acceptance_doc/${id}/file?token=${encodeURIComponent(localStorage.getItem(TOKEN_KEY) || '')}`,
}

export default http