import axios from 'axios'
import router from '../router'

const http = axios.create({ baseURL: '', timeout: 20000 })

http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('med_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

http.interceptors.response.use(
  res => {
    const d = res.data
    if (d && d.code !== undefined && d.code !== 0) {
      return Promise.reject(new Error(d.msg || '请求失败'))
    }
    return d && d.data !== undefined ? d.data : d
  },
  err => {
    if (err.response && err.response.status === 401) {
      localStorage.clear()
      router.push('/login')
      return Promise.reject(new Error('未登录或登录已过期'))
    }
    const msg = (err.response && err.response.data && (err.response.data.msg || err.response.data.error)) || err.message
    return Promise.reject(new Error(msg))
  }
)

export const auth = {
  login: (username, password, remember) =>
    http.post('/api/auth/login', { username, password, remember }),
  logout: () => http.post('/api/auth/logout'),
  me: () => http.get('/api/auth/me'),
}

export const crud = {
  list: (resource, params) => http.get(`/api/${resource}`, { params }),
  get: (resource, id) => http.get(`/api/${resource}/` + id),
  create: (resource, data) => http.post(`/api/${resource}`, data),
  update: (resource, id, data) => http.put('/api/' + resource + '/' + id, data),
  remove: (resource, id) => http.delete('/api/' + resource + '/' + id),
}

export const dashboard = () => http.get('/api/dashboard/stats')

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
