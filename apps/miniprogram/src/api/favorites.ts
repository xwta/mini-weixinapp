import { request } from './provider'
import type { PageData, Song } from '../types'

function normalizeSong(item: any): Song {
  return {
    ...item,
    id: item?.id || item?._id,
  } as Song
}

export async function getFavorites(page = 1, pageSize = 20) {
  const result = await request<PageData<Song>>('interactions', {
    action: 'listFavorites',
    page,
    page_size: pageSize,
  })

  return {
    ...result,
    items: (result?.items || []).map((item) => normalizeSong(item)),
  }
}

export async function addFavorite(songId: number | string) {
  return request<{ favorited: boolean }>('interactions', {
    action: 'addFavorite',
    song_id: songId,
  })
}

export async function removeFavorite(songId: number | string) {
  return request<{ favorited: boolean }>('interactions', {
    action: 'removeFavorite',
    song_id: songId,
  })
}
