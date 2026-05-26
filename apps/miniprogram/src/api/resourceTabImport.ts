import { request } from './provider'

export interface ResourceTabImportRequest {
  title?: string
  song_title?: string
  artist?: string
  url?: string
  raw_text?: string
  search_query?: string
  song_key?: string
  capo?: string
}

export interface ResourceTabImportResult {
  songId: string
  title: string
  artist_name?: string
  sourceUrl?: string
  sections: number
  chords: string[]
  message?: string
}

export function importResourceTab(payload: ResourceTabImportRequest) {
  return request<ResourceTabImportResult>('resource-tab-import', payload)
}
