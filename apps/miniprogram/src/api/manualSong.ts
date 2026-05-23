import { request } from './provider'
import type { Song } from '../types'

export interface ManualSongPayload {
  title: string
  artist_name?: string
  style?: string
  song_key?: string
  bpm?: number
  capo?: string
  difficulty?: string
  strumming?: string
  tags?: string[]
  raw_text: string
  is_public?: boolean
}

function normalizeSong(item: any): Song {
  return {
    ...item,
    id: item?.id || item?._id,
  } as Song
}

export async function createManualSong(payload: ManualSongPayload) {
  const result = await request<Song>('songs', {
    action: 'manualCreate',
    ...payload,
  })
  return normalizeSong(result)
}

export function publishSong(songId: number | string) {
  return request<{ published: boolean }>('songs', {
    action: 'publish',
    id: songId,
  })
}
