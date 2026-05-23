import { request } from './provider'

export interface DiscoverySong {
  _id?: string
  id?: number | string
  title: string
  artist?: string
  artist_name?: string
  likes?: number
  like_count?: number
}

function normalizeSongs(items: any[] = []): DiscoverySong[] {
  return items.map((item) => ({
    ...item,
    id: item.id || item._id,
    artist: item.artist || item.artist_name || '谱友作品',
    likes: item.likes || item.like_count || 0,
  }))
}

export async function getHotSongs() {
  const result = await request('discovery', { action: 'hot' })
  const data = result?.data || result || []
  return normalizeSongs(Array.isArray(data) ? data : data.hot || [])
}

export async function getHotKeywords() {
  const result = await request('discovery', { action: 'keywords' })
  return result?.data || result || []
}

export async function getRecommendSongs() {
  const result = await request('discovery', { action: 'recommend' })
  const data = result?.data || result || []
  return normalizeSongs(Array.isArray(data) ? data : data.recommend || [])
}

export async function getHomeDiscovery() {
  const result = await request('discovery', { action: 'home' })
  const data = result?.data || result || {}
  return {
    keywords: data.keywords || [],
    hot: normalizeSongs(data.hot || []),
    recommend: normalizeSongs(data.recommend || []),
  }
}
