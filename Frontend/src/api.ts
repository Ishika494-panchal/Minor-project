import { api as clientApi } from './api/client';

export const api = {
  auth: {
    login: (email: string, password: string) =>
      clientApi.post('/auth/login', { email, password }),
    me: () => clientApi.get('/auth/me'),
  },
  customers: {
    list: (search = '', page = 1) =>
      clientApi.get(`/customers?search=${encodeURIComponent(search)}&page=${page}&limit=10`),
    get: (id: string) => clientApi.get(`/customers/${id}`),
    create: (data: unknown) => clientApi.post('/customers', data),
    update: (id: string, data: unknown) => clientApi.put(`/customers/${id}`, data),
    delete: (id: string) => clientApi.delete(`/customers/${id}`),
    addFollowUp: (id: string, note: string) =>
      clientApi.post(`/customers/${id}/followup`, { note }),
  },
  products: {
    list: (search = '', page = 1) =>
      clientApi.get(`/products?search=${encodeURIComponent(search)}&page=${page}&limit=10`),
    get: (id: string) => clientApi.get(`/products/${id}`),
    create: (data: unknown) => clientApi.post('/products', data),
    update: (id: string, data: unknown) => clientApi.put(`/products/${id}`, data),
    delete: (id: string) => clientApi.delete(`/products/${id}`),
    adjustStock: (id: string, quantity: number, type: 'IN' | 'OUT', reason?: string) =>
      clientApi.post(`/products/${id}/stock`, { quantity, type, reason }),
    getStockMovements: (productId = '', page = 1) =>
      clientApi.get(
        `/products/stock-movements?productId=${encodeURIComponent(productId)}&page=${page}&limit=20`
      ),
  },
  challans: {
    list: (status = '', page = 1) =>
      clientApi.get(`/challans?status=${encodeURIComponent(status)}&page=${page}&limit=10`),
    get: (id: string) => clientApi.get(`/challans/${id}`),
    create: (data: unknown) => clientApi.post('/challans', data),
    updateStatus: (id: string, status: string) =>
      clientApi.patch(`/challans/${id}/status`, { status }),
    delete: (id: string) => clientApi.delete(`/challans/${id}`),
  },
};

export default api;
