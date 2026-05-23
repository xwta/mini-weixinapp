import { request } from '../utils/request'
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

export function createManualSong(payload: ManualSongPayload) {
  return request<Song>('/songs/manual', {
    method: 'POST',
    data: payload,
    showLoading: true,
  })
}

export function publishSong(songId:number){
  return request<Song>(`/songs/${songId}/publish`,{
    method:'POST'
  })
}
