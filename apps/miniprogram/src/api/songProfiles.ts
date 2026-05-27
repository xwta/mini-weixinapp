import { request } from './provider'

export interface SongProfilePreview {
  title: string
  artist: string
  key: string
  capo: string
  bpm: number
  strumming: string
  chords: string[]
  sections: string[]
  verified: boolean
  source: string
}

export interface SongProfileTestResult {
  keyword?: string
  matched: boolean
  message?: string
  title?: string
  errors?: string[]
  profile?: SongProfilePreview
}

export async function testSongProfile(keyword: string) {
  // 用户端预检直接走 ai-generate 的只读 profileCheck 动作。
  // 避免依赖额外的 song-profile-check 云函数，也不会暴露 song-profile-admin 管理函数。
  return request<SongProfileTestResult>('ai-generate', {
    action: 'profileCheck',
    type: 'web_chords',
    title: keyword,
    web_context: {
      title: keyword,
    },
  })
}
