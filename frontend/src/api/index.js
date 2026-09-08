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
}

export default http