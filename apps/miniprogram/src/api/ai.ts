import { request } from './provider'
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

function normalize(result: any): AiSongResult {
  const data = result?.data || result || {}
  return {
    songId: data.songId,
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

export async function createSongwriting(payload: SongwritingPayload) {
  const result = await request('ai-generate', {
    type: 'songwriting',
    prompt: payload.prompt,
    style: payload.style,
    difficulty: payload.difficulty,
    song_key: payload.key,
  })
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
  return normalize(result)
}
