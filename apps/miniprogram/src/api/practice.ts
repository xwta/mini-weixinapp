import { request } from './provider'

export interface PracticeRecordPayload {
  song_id: number | string
  duration_seconds: number
  bpm?: number
  scroll_speed?: number
  practiced_sections?: Record<string, any>
}

export function createPracticeRecord(payload: PracticeRecordPayload) {
  return request('songs', {
    action: 'practiceCreate',
    ...payload,
  })
}

export function getRecentPracticeRecords(page = 1, pageSize = 20) {
  return request('songs', {
    action: 'practiceRecent',
    page,
    page_size: pageSize,
  })
}
