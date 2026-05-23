import { request } from './provider'
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

function normalizePage<T>(result: any): PageData<T> {
  const data = result?.data || result
  return {
    total: data?.total || data?.items?.length || 0,
    page: data?.page || 1,
    page_size: data?.page_size || data?.items?.length || 20,
    items: data?.items || [],
  }
}

export async function getMySongs(page = 1, pageSize = 20) {
  const result = await request('songs', { action: 'mine', page, page_size: pageSize })
  return normalizePage<Song>(result)
}

export async function searchSongs(params: SongSearchParams = {}) {
  const result = await request('songs', {
    action: 'search',
    keyword: params.keyword || '',
    difficulty: params.difficulty || '',
    song_key: params.song_key || '',
    source_type: params.source_type || '',
    sort: params.sort || 'created_at',
    page: params.page || 1,
    page_size: params.page_size || 20,
  })
  return normalizePage<Song>(result)
}

export async function getSongDetail(songId: number | string) {
  const result = await request('songs', { action: 'detail', id: songId })
  return (result?.data || result) as Song
}

export async function deleteSong(songId: number | string) {
  const result = await request('songs', { action: 'remove', id: songId })
  return result?.data || result
}
