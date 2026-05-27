import { request } from './provider'

export type WebSearchResultType = 'web' | 'image' | 'text' | 'fallback'
export type WebSearchActionHint = 'preview' | 'import' | 'view_only'
export type WebPreferredOutputType = 'txt' | 'image' | 'both' | 'auto'

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
  outputPreference?: WebPreferredOutputType | string
  difficulty?: string
}

export interface WebQueryIntent {
  raw?: string
  title?: string
  artist?: string
  clean?: string
  compact?: string
  base?: string
  outputPreference?: WebPreferredOutputType | string
  difficulty?: string
  requestedKey?: string
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
  preferred_output_type?: 'txt' | 'image' | 'both'
  searchDebug?: Array<Record<string, any>>
}

export interface WebSongSearchOptions {
  forceRefresh?: boolean
}

export interface WebSongSearchResult {
  query: string
  queryIntent?: WebQueryIntent
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
  // 谱灵定位是“搜吉他谱工具”，用户只需要输入歌名。
  // 搜索结果默认进入“双谱生成”：TXT弹唱谱 + 图片六线谱。
  return request<WebSongSearchResult>('web-search', buildSearchPayload(keyword, options))
}

export async function searchWebTabs(keyword: string, options: WebSongSearchOptions = {}) {
  return request<WebSongSearchResult>('web-search', buildSearchPayload(keyword, options))
}
