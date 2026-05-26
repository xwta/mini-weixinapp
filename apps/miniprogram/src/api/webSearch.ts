import { request } from './provider'

export interface WebSearchReference {
  title: string
  url: string
  snippet: string
  category?: string
  provider?: string
  tab_score?: number
}

export interface WebArrangementHints {
  possibleKeys?: string[]
  possibleCapos?: string[]
  possibleChords?: string[]
  tabReferenceCount?: number
}

export interface WebSongCandidate {
  title: string
  artist?: string
  album?: string
  duration?: number
  confidence: number
  source: 'web' | 'keyword' | string
  summary: string
  references: WebSearchReference[]
  tabReferences?: WebSearchReference[]
  arrangementHints?: WebArrangementHints
}

export interface WebSongSearchResult {
  query: string
  queryVariants?: string[]
  tabQueryVariants?: string[]
  tabSearchEnabled?: boolean
  candidates: WebSongCandidate[]
  canGenerate: boolean
  notice?: string
  provider?: string
}

export async function searchWebSong(keyword: string) {
  // 谱灵定位是“搜吉他谱工具”，用户输入歌名即可。
  // 即使用户没有显式输入“吉他谱/和弦谱/弹唱谱”，也默认走 tabLookup。
  return request<WebSongSearchResult>('web-search', {
    action: 'tabLookup',
    keyword,
  })
}

export async function searchWebTabs(keyword: string) {
  return request<WebSongSearchResult>('web-search', {
    action: 'tabLookup',
    keyword,
  })
}
