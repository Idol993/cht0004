import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  getProfile: () => api.get('/auth/profile').then(r => r.data),
  getAllUsers: () => api.get('/auth/all').then(r => r.data)
}

export const billApi = {
  create: (data) => api.post('/bills', data).then(r => r.data),
  getList: (params) => api.get('/bills/list', { params }).then(r => r.data),
  getDetail: (id) => api.get(`/bills/${id}`).then(r => r.data),
  updateShares: (id, shares) => api.put(`/bills/${id}/shares`, { shares }).then(r => r.data),
  pay: (id, data) => api.post(`/bills/${id}/pay`, data).then(r => r.data),
  confirmSettlement: (id) => api.post(`/bills/${id}/confirm-settlement`).then(r => r.data),
  getPending: () => api.get('/bills/my/pending').then(r => r.data),
  getHistory: (params) => api.get('/bills/my/history', { params }).then(r => r.data),
  exportMyMonthly: (month) => api.get(`/bills/my/export/${month}`, { responseType: 'blob' }).then(r => r),
  delete: (id) => api.delete(`/bills/${id}`).then(r => r.data)
}

export const notificationApi = {
  getList: (params) => api.get('/notifications/list', { params }).then(r => r.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then(r => r.data),
  markRead: (id) => api.post(`/notifications/read/${id}`).then(r => r.data),
  markAllRead: () => api.post('/notifications/read-all').then(r => r.data)
}

export const adminApi = {
  getStats: () => api.get('/admin/stats').then(r => r.data),
  getAllBills: (params) => api.get('/admin/all-bills', { params }).then(r => r.data),
  getUsers: () => api.get('/admin/users').then(r => r.data),
  exportMonthly: (month) => api.get(`/admin/export/monthly/${month}`, { responseType: 'blob' }).then(r => r),
  exportUser: (userId) => api.get(`/admin/user-export/${userId}`, { responseType: 'blob' }).then(r => r)
}

export default api
