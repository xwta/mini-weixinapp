import { request } from '../utils/request'
import { useAuthStore } from '../stores/auth'
import type { User } from '../types'

interface LoginResult {
  token: string
  user: User
}

export async function loginWithWechatProfile(profile?: { nickname?: string; avatar_url?: string }) {
  const loginResult = await new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({ provider: 'weixin', success: resolve, fail: reject })
  })

  const data = await request<LoginResult>('/auth/wechat-login', {
    method: 'POST',
    auth: false,
    showLoading: true,
    data: {
      code: loginResult.code || `dev_${Date.now()}`,
      nickname: profile?.nickname || '谱灵用户',
      avatar_url: profile?.avatar_url || '',
    },
  })

  useAuthStore().setAuth(data.token, data.user)
  return data
}

export async function getCurrentUser() {
  return request<User>('/users/me')
}
