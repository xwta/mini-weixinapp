import { APP_CONFIG } from '../config'
import { useAuthStore } from '../stores/auth'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface RequestOptions {
  method?: HttpMethod
  data?: Record<string, any> | string | number | boolean | null
  params?: Record<string, any>
  auth?: boolean
  showLoading?: boolean
}

function buildUrl(path: string, params?: Record<string, any>) {
  const base = `${APP_CONFIG.apiBaseUrl}${path}`
  if (!params || Object.keys(params).length === 0) return base
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${base}?${query}` : base
}

export function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', data, params, auth = true, showLoading = false } = options
  const authStore = useAuthStore()

  if (showLoading) {
    uni.showLoading({ title: '加载中', mask: true })
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: buildUrl(path, params),
      method,
      data: data as any,
      header: {
        'Content-Type': 'application/json',
        ...(auth && authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
      },
      success: (res) => {
        const statusCode = res.statusCode || 0
        const body = res.data as ApiResponse<T> | any
        if (statusCode >= 200 && statusCode < 300) {
          if (body && typeof body === 'object' && 'code' in body) {
            if (body.code === 0) {
              resolve(body.data as T)
            } else {
              uni.showToast({ title: body.message || '请求失败', icon: 'none' })
              reject(body)
            }
          } else {
            resolve(body as T)
          }
          return
        }
        const message = body?.detail || body?.message || `请求失败 ${statusCode}`
        if (statusCode === 401) authStore.logout()
        uni.showToast({ title: message, icon: 'none' })
        reject(body || new Error(message))
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        reject(err)
      },
      complete: () => {
        if (showLoading) uni.hideLoading()
      },
    })
  })
}
