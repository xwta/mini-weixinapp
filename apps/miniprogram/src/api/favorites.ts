import { request } from '../utils/request'
import type { PageData, Song } from '../types'

export function getFavorites(page = 1, pageSize = 20) {
  return request<PageData<Song>>('/favorites', {
    params: { page, page_size: pageSize },
  })
}

export function addFavorite(songId: number) {
  return request<{ favorited: boolean }>('/favorites', {
    method: 'POST',
    params: { song_id: songId },
  })
}

export function removeFavorite(songId: number) {
  return request<{ favorited: boolean }>(`/favorites/${songId}`, {
    method: 'DELETE',
  })
}
