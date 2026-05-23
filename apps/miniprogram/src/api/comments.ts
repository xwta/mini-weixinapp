import { request } from '../utils/request'

export interface CommentItem {
  id: number
  user_id: number
  song_id: number
  parent_id?: number | null
  content: string
  like_count: number
  created_at: string
}

export function getSongComments(songId: number) {
  return request<CommentItem[]>(`/comments/song/${songId}`, { auth: false })
}

export function createComment(songId: number, content: string, parentId?: number | null) {
  return request<CommentItem>('/comments', {
    method: 'POST',
    data: {
      song_id: songId,
      content,
      parent_id: parentId || null,
    },
  })
}
