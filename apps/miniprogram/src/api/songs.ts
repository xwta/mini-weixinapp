import { request } from '../utils/request'
import type { PageData, Song } from '../types'

export interface SongSearchParams {
  keyword?: string
  difficulty?: string
  song_key?: string
  source_type?: string
  sort?: 'latest' | 'likes' | 'favorites' | 'views'
  page?: number
  page_size?: number
}

export function getMySongs(page = 1, pageSize = 20) {
  return request<PageData<Song>>('/songs/mine', {
    params: { page, page_size: pageSize },
  })
}

export function searchSongs(params: SongSearchParams = {}) {
  return request<PageData<Song>>('/songs/search', {
    auth: false,
    params: {
      keyword: params.keyword || '',
      difficulty: params.difficulty || '',
      song_key: params.song_key || '',
      source_type: params.source_type || '',
      sort: params.sort || 'latest',
      page: params.page || 1,
      page_size: params.page_size || 20,
    },
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
