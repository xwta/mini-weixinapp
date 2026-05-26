import { request } from './provider'

export interface ResourcePreviewRequest {
  title?: string
  url?: string
  image_url?: string
  thumbnail_url?: string
  search_query?: string
}

export interface ResourcePreviewResult {
  title: string
  fileID: string
  tempFileURL: string
  contentType: string
  size: number
  sourceUrl: string
  imageUrl?: string
  notice?: string
}

export function previewResourceImage(payload: ResourcePreviewRequest) {
  return request<ResourcePreviewResult>('resource-preview', payload)
}
