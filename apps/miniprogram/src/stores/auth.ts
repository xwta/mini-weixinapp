import { reactive } from 'vue'
import { APP_CONFIG } from '../config'
import type { User } from '../types'

interface AuthState {
  token: string
  user: User | null
  restore: () => void
  setAuth: (token: string, user: User) => void
  logout: () => void
  readonly isLoggedIn: boolean
}

const authStore = reactive<AuthState>({
  token: '',
  user: null,
  restore() {
    this.token = uni.getStorageSync(APP_CONFIG.storageKeys.token) || ''
    const storedUser = uni.getStorageSync(APP_CONFIG.storageKeys.user)
    this.user = storedUser || null
  },
  setAuth(token: string, user: User) {
    this.token = token
    this.user = user
    uni.setStorageSync(APP_CONFIG.storageKeys.token, token)
    uni.setStorageSync(APP_CONFIG.storageKeys.user, user)
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
