import { request } from './provider'

export interface CommentItem {
  _id?: string
  id?: string | number
  user_id: string | number
  song_id: string | number
  parent_id?: string | number | null
  nickname?: string
  avatar_url?: string
  content: string
  like_count: number
  created_at: string
}

function normalizeComment(item: any): CommentItem {
  return {
    ...item,
    id: item?.id || item?._id,
  }
}

export async function getSongComments(songId: number | string) {
  const result = await request('comments', {
    action: 'list',
    song_id: songId,
  })
  const items = result?.data?.items || result?.items || []
  return items.map((item: any) => normalizeComment(item))
}

export async function createComment(songId: number | string, content: string, parentId?: number | string | null) {
  const result = await request('comments', {
    action: 'create',
    song_id: songId,
    content,
    parent_id: parentId || null,
  })
  return normalizeComment(result?.data || result)
}

export async function removeComment(commentId: string) {
  const result = await request('comments', {
    action: 'remove',
    id: commentId,
  })
  return result?.data || result
}
