import { useAuthStore } from '../stores/auth'

interface CloudbaseResult<T = any> {
  code?: number
  message?: string
  data?: T
  [key: string]: any
}

const FRIENDLY_FUNCTION_NAMES: Record<string, string> = {
  'web-search': '曲谱搜索',
  'resource-preview': '图片谱预览',
  'resource-tab-import': '曲谱导入',
  'ai-generate': 'AI 编配',
  songs: '曲库',
  auth: '登录',
  favorites: '收藏',
  practice: '练习记录',
}

const RETRYABLE_PATTERNS = [
  /timeout|timed out|超时/i,
  /network|socket|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i,
  /internal|system error|server error/i,
  /cloud function service error/i,
]

function ensureCloudReady() {
  // #ifdef MP-WEIXIN
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.callFunction) {
    throw new Error('云服务未就绪，请重新进入小程序后再试')
  }
  // #endif
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getFriendlyFunctionName(functionName: string) {
  return FRIENDLY_FUNCTION_NAMES[functionName] || functionName
}

function normalizeErrorMessage(error: any, functionName: string) {
  const raw = String(error?.message || error?.errMsg || error || '')
  const friendlyName = getFriendlyFunctionName(functionName)

  if (/timeout|timed out|超时/i.test(raw)) return `${friendlyName}响应超时，请稍后重试`
  if (/network|socket|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fail/i.test(raw)) return `${friendlyName}连接不稳定，请检查网络后重试`
  if (/permission|unauthorized|not authorized|denied/i.test(raw)) return `${friendlyName}权限不足，请重新登录后再试`
  if (/not found|不存在/i.test(raw)) return `${friendlyName}服务未部署或名称不正确`
  return raw || `${friendlyName}暂时不可用，请稍后再试`
}

function isRetryableError(error: any) {
  const raw = String(error?.message || error?.errMsg || error || '')
  return RETRYABLE_PATTERNS.some(pattern => pattern.test(raw))
}

async function callFunctionWithRetry(functionName: string, data: Record<string, any>) {
  // #ifdef MP-WEIXIN
  let lastError: any = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await wx.cloud.callFunction({ name: functionName, data })
    } catch (error: any) {
      lastError = error
      if (!isRetryableError(error) || attempt >= 1) break
      await sleep(260)
    }
  }
  throw lastError
  // #endif

  // #ifndef MP-WEIXIN
  throw new Error('当前平台不支持云函数调用')
  // #endif
}

export async function request<T = any>(functionName: string, data: Record<string, any> = {}): Promise<T> {
  const authStore = useAuthStore()
  ensureCloudReady()

  try {
    const result = await callFunctionWithRetry(functionName, data)
    const payload = (result?.result || {}) as CloudbaseResult<T>

    if (typeof payload === 'object' && payload !== null && 'code' in payload) {
      if (payload.code === 0) {
        return (payload.data as T) ?? (payload as unknown as T)
      }

      const message = payload.message || `${getFriendlyFunctionName(functionName)}请求失败`
      if (payload.code === 401) {
        authStore.logout()
      }
      throw new Error(message)
    }

    return payload as T
  } catch (error: any) {
    const message = normalizeErrorMessage(error, functionName)
    uni.showToast({ title: message, icon: 'none' })
    throw new Error(message)
  }
}
