import { request } from '../utils/request'
import type { PageData, Song } from '../types'

export function getMySongs(page = 1, pageSize = 20) {
  return request<PageData<Song>>('/songs/mine', {
    params: { page, page_size: pageSize },
  })
}

export function searchSongs(keyword = '', page = 1, pageSize = 20) {
  return request<PageData<Song>>('/songs/search', {
    auth: false,
    params: { keyword, page, page_size: pageSize },
  })
}

export function getSongDetail(songId: number) {
  return request<Song>(`/songs/${songId}`, {
    auth: false,
  })
}

export function deleteSong(songId: number) {
  return request<{ deleted: boolean }>(`/songs/${songId}`, {
    method: 'DELETE',
  })
}
