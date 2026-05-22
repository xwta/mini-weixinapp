import { request } from '../utils/request'
import type { AiSongResult } from '../types'

export interface SongwritingPayload {
  prompt: string
  style: string
  difficulty: string
  key: string
  language: string
}

export interface ChordsPayload {
  lyrics: string
  key: string
  difficulty: string
  rhythm: string
}

export function createSongwriting(payload: SongwritingPayload) {
  return request<AiSongResult>('/ai/songwriting', {
    method: 'POST',
    data: payload,
    showLoading: true,
  })
}

export function createChords(payload: ChordsPayload) {
  return request<AiSongResult>('/ai/chords', {
    method: 'POST',
    data: payload,
    showLoading: true,
  })
}
