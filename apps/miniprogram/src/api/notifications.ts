import { request } from './provider'

export interface NotificationItem {
  _id: string
  user_openid: string
  type: string
  title: string
  content: string
  target_id?: string
  is_read: boolean
  created_at: string
}

export async function getNotifications(pageSize = 50) {
  const result = await request('notifications', {
    action: 'list',
    page_size: pageSize,
  })
  return result?.data?.items || result?.items || []
}

export async function getUnreadNotificationCount() {
  const result = await request('notifications', {
    action: 'unreadCount',
  })
  return result?.data?.count || result?.count || 0
}

export async function markNotificationRead(id: string) {
  const result = await request('notifications', {
    action: 'read',
    id,
  })
  return result?.data || result
}

export async function markAllNotificationsRead() {
  const result = await request('notifications', {
    action: 'readAll',
  })
  return result?.data || result
}
