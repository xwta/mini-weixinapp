import { request } from '../utils/request'

export interface DiscoverySong {
  id: number
  title: string
  artist?: string
  likes?: number
}

export function getHotSongs() {
  return request<DiscoverySong[]>('/discovery/hot', { auth: false })
}

export function getHotKeywords() {
  return request<string[]>('/discovery/keywords', { auth: false })
}

export function getRecommendSongs() {
  return request<DiscoverySong[]>('/discovery/recommend', { auth: false })
}
