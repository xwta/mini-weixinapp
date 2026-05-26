import { request } from './provider'

export type WebSearchResultType = 'web' | 'image' | 'text' | 'fallback'
export type WebSearchActionHint = 'preview' | 'import' | 'view_only'

export interface WebSearchReference {
  title: string
  url: string
  snippet: string
  category?: string
  provider?: string
  tab_score?: number
  result_type?: WebSearchResultType | string
  thumbnail_url?: string
  image_url?: string
  source_site?: string
  importable?: boolean
  previewable?: boolean
  action_hint?: WebSearchActionHint | string
  action_label?: string
}

export interface WebArrangementHints {
  possibleKeys?: string[]
  possibleCapos?: string[]
  possibleChords?: string[]
  tabReferenceCount?: number
  imageReferenceCount?: number
  textReferenceCount?: number
  viewOnlyCount?: number
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

export interface WebSongSearchOptions {
  forceRefresh?: boolean
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
  cacheVersion?: string
}

function buildSearchPayload(keyword: string, options: WebSongSearchOptions = {}) {
  return {
    action: 'tabLookup',
    keyword,
    force_refresh: Boolean(options.forceRefresh),
  }
}

export async function searchWebSong(keyword: string, options: WebSongSearchOptions = {}) {
  // 谱灵定位是“搜吉他谱工具”，用户输入歌名即可。
  // 即使用户没有显式输入“吉他谱/和弦谱/弹唱谱”，也默认走 tabLookup。
  return request<WebSongSearchResult>('web-search', buildSearchPayload(keyword, options))
}

export async function searchWebTabs(keyword: string, options: WebSongSearchOptions = {}) {
  return request<WebSongSearchResult>('web-search', buildSearchPayload(keyword, options))
}
