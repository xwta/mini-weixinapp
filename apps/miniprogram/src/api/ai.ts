import { request } from './provider'
import { useAuthStore } from '../stores/auth'
import type { AiSongResult } from '../types'
import type { WebSongCandidate } from './webSearch'

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

export type TabOutputType = 'txt' | 'image'

export interface WebChordsPayload {
  title: string
  artist?: string
  key: string
  difficulty: string
  web_context: WebSongCandidate
  output_type?: TabOutputType
}

function normalize(result: any): AiSongResult {
  const data = result?.data || result || {}
  return {
    songId: data.songId || data.id || data._id,
    title: data.title || 'AI原创弹唱歌',
    style: data.style || '民谣',
    key: data.key || data.song_key || 'C',
    bpm: data.bpm || 86,
    capo: data.capo || '0品',
    difficulty: data.difficulty || '新手',
    strumming: data.strumming || '',
    chords: data.chords || [],
    sections: data.sections || [],
    practiceTips: data.practiceTips || [],
  }
}

function syncQuotaFromResult(result: any) {
  const data = result?.data || result || {}
  const userPatch = data.user || {}
  const hasQuota = userPatch.generation_quota !== undefined || data.generation_quota !== undefined
  const hasTotal = userPatch.total_generated !== undefined || data.total_generated !== undefined

  if (!hasQuota && !hasTotal) return

  useAuthStore().patchUser({
    generation_quota: Number(userPatch.generation_quota ?? data.generation_quota ?? 0),
    total_generated: Number(userPatch.total_generated ?? data.total_generated ?? 0),
  })
}

export async function createSongwriting(payload: SongwritingPayload) {
  const result = await request('ai-generate', {
    type: 'songwriting',
    prompt: payload.prompt,
    style: payload.style,
    difficulty: payload.difficulty,
    song_key: payload.key,
  })
  syncQuotaFromResult(result)
  return normalize(result)
}

export async function createChords(payload: ChordsPayload) {
  const result = await request('ai-generate', {
    type: 'chords',
    lyrics: payload.lyrics,
    song_key: payload.key,
    difficulty: payload.difficulty,
    rhythm: payload.rhythm,
  })
  syncQuotaFromResult(result)
  return normalize(result)
}

export async function createWebChords(payload: WebChordsPayload) {
  const result = await request('ai-generate', {
    type: 'web_chords',
    title: payload.title,
    artist: payload.artist || '',
    song_key: payload.key,
    difficulty: payload.difficulty,
    tab_output_type: payload.output_type || 'txt',
    output_type: payload.output_type || 'txt',
    web_context: payload.web_context,
  })
  syncQuotaFromResult(result)
  return normalize(result)
}
