import { request } from './provider'
import type { PageData, Song, User } from '../types'

export interface UserProfile {
  user: User
  stats: {
    works_count: number
    likes_count: number
    followers_count: number
    following_count: number
  }
}

function normalizeSong(item: any): Song {
  return {
    ...item,
    id: item?.id || item?._id,
  } as Song
}

export function likeSong(songId: number | string) {
  return request<{ liked: boolean; like_count: number }>('interactions', {
    action: 'likeSong',
    song_id: songId,
  })
}

export function unlikeSong(songId: number | string) {
  return request<{ liked: boolean; like_count: number }>('interactions', {
    action: 'unlikeSong',
    song_id: songId,
  })
}

export async function getMyLikedSongs(page = 1, pageSize = 20) {
  const result = await request<PageData<Song>>('interactions', {
    action: 'listLiked',
    page,
    page_size: pageSize,
  })

  return {
    ...result,
    items: (result?.items || []).map((item) => normalizeSong(item)),
  }
}

export function followUser(userId: number | string) {
  return request<{ following: boolean }>('songs', {
    action: 'follow',
    user_id: userId,
  })
}

export function unfollowUser(userId: number | string) {
  return request<{ following: boolean }>('songs', {
    action: 'unfollow',
    user_id: userId,
  })
}

export function getUserProfile(userId: number | string) {
  return request<UserProfile>('songs', {
    action: 'userProfile',
    user_id: userId,
  })
}

export async function getUserSongs(userId: number | string, page = 1, pageSize = 20) {
  const result = await request<PageData<Song>>('songs', {
    action: 'userSongs',
    user_id: userId,
    page,
    page_size: pageSize,
  })

  return {
    ...result,
    items: (result?.items || []).map((item) => normalizeSong(item)),
  }
}
