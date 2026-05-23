import { useAuthStore } from '../stores/auth'

interface CloudbaseResult<T = any> {
  code?: number
  message?: string
  data?: T
  [key: string]: any
}

function ensureCloudReady() {
  // #ifdef MP-WEIXIN
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.callFunction) {
    throw new Error('云开发未初始化，请检查 wx.cloud.init 配置')
  }
  // #endif
}

export async function request<T = any>(functionName: string, data: Record<string, any> = {}): Promise<T> {
  const authStore = useAuthStore()
  ensureCloudReady()

  try {
    // #ifdef MP-WEIXIN
    const result = await wx.cloud.callFunction({ name: functionName, data })
    const payload = (result?.result || {}) as CloudbaseResult<T>

    if (typeof payload === 'object' && payload !== null && 'code' in payload) {
      if (payload.code === 0) {
        return (payload.data as T) ?? (payload as unknown as T)
      }

      const message = payload.message || '请求失败'
      if (payload.code === 401) {
        authStore.logout()
      }
      uni.showToast({ title: message, icon: 'none' })
      throw new Error(message)
    }

    return payload as T
    // #endif

    // #ifndef MP-WEIXIN
    throw new Error('当前平台不支持云函数调用')
    // #endif
  } catch (error: any) {
    const message = error?.message || error?.errMsg || '云函数调用失败'
    uni.showToast({ title: message, icon: 'none' })
    throw error
  }
}
