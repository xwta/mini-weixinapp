import { reactive } from 'vue'
import { APP_CONFIG } from '../config'
import type { User } from '../types'

interface AuthState {
  token: string
  user: User | null
  restore: () => void
  setAuth: (token: string, user: User | Record<string, any>) => void
  patchUser: (patch: Partial<User> | Record<string, any>) => void
  logout: () => void
  readonly isLoggedIn: boolean
}

function normalizeUser(user: User | Record<string, any>): User {
  const raw = (user || {}) as Record<string, any>
  return {
    id: raw.id || raw._id || '',
    nickname: raw.nickname || '谱灵用户',
    avatar_url: raw.avatar_url || '',
    membership_type: raw.membership_type || 'free',
    generation_quota: Number(raw.generation_quota || 0),
    daily_free_quota: Number(raw.daily_free_quota || 0),
    total_generated: Number(raw.total_generated || 0),
    created_at: raw.created_at,
  }
}

const authStore = reactive<AuthState>({
  token: '',
  user: null,
  restore() {
    this.token = uni.getStorageSync(APP_CONFIG.storageKeys.token) || ''
    const storedUser = uni.getStorageSync(APP_CONFIG.storageKeys.user)
    this.user = storedUser ? normalizeUser(storedUser) : null
  },
  setAuth(token: string, user: User | Record<string, any>) {
    this.token = token
    this.user = normalizeUser(user)
    uni.setStorageSync(APP_CONFIG.storageKeys.token, token)
    uni.setStorageSync(APP_CONFIG.storageKeys.user, this.user)
  },
  patchUser(patch: Partial<User> | Record<string, any>) {
    if (!this.user) return
    const merged = {
      ...this.user,
      ...(patch as Record<string, any>),
    }
    this.user = normalizeUser(merged)
    uni.setStorageSync(APP_CONFIG.storageKeys.user, this.user)
  },
  logout() {
    this.token = ''
    this.user = null
    uni.removeStorageSync(APP_CONFIG.storageKeys.token)
    uni.removeStorageSync(APP_CONFIG.storageKeys.user)
  },
  get isLoggedIn() {
    return Boolean(this.token)
  },
})

export function useAuthStore() {
  return authStore
}
