import { request } from '../utils/request'
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

export function likeSong(songId: number) {
  return request<{ liked: boolean; like_count: number }>(`/songs/${songId}/like`, {
    method: 'POST',
  })
}

export function unlikeSong(songId: number) {
  return request<{ liked: boolean; like_count: number }>(`/songs/${songId}/like`, {
    method: 'DELETE',
  })
}

export function getMyLikedSongs(page = 1, pageSize = 20) {
  return request<PageData<Song>>('/users/me/likes', {
    params: { page, page_size: pageSize },
  })
}

export function followUser(userId: number) {
  return request<{ following: boolean }>(`/users/${userId}/follow`, {
    method: 'POST',
  })
}

export function unfollowUser(userId: number) {
  return request<{ following: boolean }>(`/users/${userId}/follow`, {
    method: 'DELETE',
  })
}

export function getUserProfile(userId: number) {
  return request<UserProfile>(`/users/${userId}/profile`, { auth: false })
}

export function getUserSongs(userId: number, page = 1, pageSize = 20) {
  return request<PageData<Song>>(`/users/${userId}/songs`, {
    auth: false,
    params: { page, page_size: pageSize },
  })
}
