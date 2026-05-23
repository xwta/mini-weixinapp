import { request } from './provider'

export interface AiImagePayload {
  prompt: string
  model?: string
}

export interface AiImageResult {
  imageUrl: string
  raw?: Record<string, any>
}

export function generateAiImage(payload: AiImagePayload) {
  return request<AiImageResult>('ai-image', {
    prompt: payload.prompt,
    model: payload.model,
  })
}
