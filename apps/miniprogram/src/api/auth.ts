import { request } from './provider'
import { useAuthStore } from '../stores/auth'
import type { User } from '../types'

interface LoginResult {
  token: string
  user: User
}

export async function loginWithWechatProfile(profile?: { nickname?: string; avatar_url?: string }) {
  const result = await request('login', {
    nickname: profile?.nickname || '谱灵用户',
    avatar_url: profile?.avatar_url || '',
  })

  const data = (result?.data || result) as LoginResult
  useAuthStore().setAuth(data.token, data.user)
  return data
}

export async function getCurrentUser() {
  const auth = useAuthStore()
  return auth.user as User
}
