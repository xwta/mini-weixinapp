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
  keyword: string
  matched: boolean
  message?: string
  title?: string
  errors?: string[]
  profile?: SongProfilePreview
}

export async function testSongProfile(keyword: string) {
  return request<SongProfileTestResult>('song-profile-admin', {
    action: 'testMatch',
    keyword,
  })
}

export async function smokeTestSongProfiles(keywords?: string[]) {
  return request<{ total: number; matched: number; failed: SongProfileTestResult[]; results: SongProfileTestResult[] }>('song-profile-admin', {
    action: 'smokeTest',
    keywords,
  })
}
