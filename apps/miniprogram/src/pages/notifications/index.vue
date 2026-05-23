<template>
  <view class="page">
    <AppNavbar title="消息中心" @back="goBack" />

    <view class="top-actions">
      <view class="unread">未读 {{ unreadCount }}</view>
      <view class="read-all" @tap="readAll">全部已读</view>
    </view>

    <view class="list">
      <view v-for="item in notifications" :key="item._id" :class="['notice-card', !item.is_read && 'unread-card']" @tap="readOne(item)">
        <view class="notice-icon">{{ iconOf(item.type) }}</view>
        <view class="notice-main">
          <view class="notice-title">{{ item.title }}</view>
          <view class="notice-content">{{ item.content || '你有一条新的谱灵通知' }}</view>
          <view class="notice-time">{{ item.created_at || '最近' }}</view>
        </view>
        <view v-if="!item.is_read" class="dot" />
      </view>

      <view v-if="!notifications.length && !loading" class="empty-card">
        <view class="empty-icon">✉</view>
        <view class="empty-title">暂无消息</view>
        <view class="empty-desc">点赞、评论、关注和系统通知会出现在这里。</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/base/AppNavbar.vue'
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/api/notifications'
import { loginWithWechatProfile } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const notifications = ref<NotificationItem[]>([])
const unreadCount = ref(0)
const loading = ref(false)

onShow(load)

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

async function load() {
  loading.value = true
  try {
    await ensureLogin()
    const [items, count] = await Promise.all([
      getNotifications(50),
      getUnreadNotificationCount(),
    ])
    notifications.value = items
    unreadCount.value = count
  } catch (error) {
    console.log('notifications load failed', error)
  } finally {
    loading.value = false
  }
}

function iconOf(type: string) {
  const map: Record<string, string> = {
    like: '♡',
    comment: '评',
    follow: '人',
    system: '谱',
  }
  return map[type] || '谱'
}

async function readOne(item: NotificationItem) {
  if (item.is_read) return
  await markNotificationRead(item._id)
  item.is_read = true
  unreadCount.value = Math.max(0, unreadCount.value - 1)
}

async function readAll() {
  await markAllNotificationsRead()
  notifications.value = notifications.value.map((item) => ({ ...item, is_read: true }))
  unreadCount.value = 0
  uni.showToast({ title: '已全部标记', icon: 'success' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { width: 750rpx; min-height: 100vh; background: #F6FBF8; padding-bottom: 48rpx; box-sizing: border-box; }
.top-actions { width: 750rpx; padding: 20rpx 32rpx; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; }
.unread { color: #17231E; font-size: 28rpx; font-weight: 800; }
.read-all { height: 56rpx; padding: 0 24rpx; border-radius: 999rpx; background: #EAF8F0; color: #0BA45A; display: flex; align-items: center; font-size: 24rpx; font-weight: 700; }
.list { padding: 0 32rpx; box-sizing: border-box; }
.notice-card { width: 686rpx; padding: 24rpx; margin-bottom: 20rpx; box-sizing: border-box; border-radius: 24rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; display: flex; gap: 18rpx; align-items: flex-start; box-shadow: 0 8rpx 28rpx rgba(18,52,36,.06); }
.unread-card { border-color: #BCEBD2; }
.notice-icon { width: 64rpx; height: 64rpx; border-radius: 22rpx; background: #EAF8F0; color: #0BA45A; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 800; flex-shrink: 0; }
.notice-main { flex: 1; min-width: 0; }
.notice-title { color: #17231E; font-size: 30rpx; font-weight: 800; }
.notice-content { margin-top: 8rpx; color: #6B756F; font-size: 24rpx; line-height: 36rpx; }
.notice-time { margin-top: 10rpx; color: #A4AEA8; font-size: 22rpx; }
.dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #0BA45A; margin-top: 8rpx; flex-shrink: 0; }
.empty-card { width: 686rpx; padding: 72rpx 32rpx; border-radius: 28rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
.empty-icon { width: 96rpx; height: 96rpx; border-radius: 32rpx; background: #EAF8F0; color: #0BA45A; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 800; }
.empty-title { margin-top: 24rpx; color: #17231E; font-size: 30rpx; font-weight: 800; }
.empty-desc { margin-top: 10rpx; color: #6B756F; font-size: 24rpx; text-align: center; }
</style>
