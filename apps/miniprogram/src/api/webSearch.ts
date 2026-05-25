import { request } from './provider'

export interface WebSearchReference {
  title: string
  url: string
  snippet: string
}

export interface WebSongCandidate {
  title: string
  artist?: string
  confidence: number
  source: 'web' | 'keyword' | string
  summary: string
  references: WebSearchReference[]
}

export interface WebSongSearchResult {
  query: string
  candidates: WebSongCandidate[]
  canGenerate: boolean
  notice?: string
}

export async function searchWebSong(keyword: string) {
  return request<WebSongSearchResult>('web-search', {
    action: 'songLookup',
    keyword,
  })
}
