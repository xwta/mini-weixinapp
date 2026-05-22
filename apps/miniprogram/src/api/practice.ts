import { request } from '../utils/request'

export interface PracticeRecordPayload {
  song_id: number
  duration_seconds: number
  bpm?: number
  scroll_speed?: number
  practiced_sections?: Record<string, any>
}

export function createPracticeRecord(payload: PracticeRecordPayload) {
  return request('/practice-records', {
    method: 'POST',
    data: payload,
  })
}

export function getRecentPracticeRecords(page = 1, pageSize = 20) {
  return request('/practice-records/recent', {
    params: { page, page_size: pageSize },
  })
}
