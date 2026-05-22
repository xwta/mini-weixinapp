import { request } from '../utils/request'

export interface Product {
  code: string
  name: string
  product_type: string
  amount: number
  description: string
  benefits: string[]
}

export interface Order {
  id: number
  order_no: string
  product_code: string
  product_type: string
  amount: number
  payment_status: string
  payment_method: string
  created_at: string
}

export function getProducts() {
  return request<Product[]>('/products', { auth: false })
}

export function createOrder(productCode: string) {
  return request<{ order: Order; payment_params: Record<string, any> }>('/orders/create', {
    method: 'POST',
    data: { product_code: productCode },
    showLoading: true,
  })
}

export function getMyOrders(page = 1, pageSize = 20) {
  return request<{ total: number; page: number; page_size: number; items: Order[] }>('/orders/mine', {
    params: { page, page_size: pageSize },
  })
}
