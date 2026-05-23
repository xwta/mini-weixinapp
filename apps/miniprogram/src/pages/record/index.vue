<template>
  <view class="page">
    <AppNavbar title="我的记录" @back="goBack" />

    <view class="search-section">
      <AppSearchBar v-model="keyword" placeholder="搜索对话、创作、曲谱记录" @confirm="loadRecords" />
    </view>

    <view class="tabs-section">
      <AppTabs v-model="activeType" :items="tabs" />
    </view>

    <view class="record-list">
      <view
        v-for="item in filteredRecords"
        :key="item.id"
        class="record-card"
        @tap="openRecord(item)"
      >
        <view class="record-top">
          <view class="record-icon">{{ item.icon }}</view>
          <view class="record-main">
            <text class="record-title">{{ item.title }}</text>
            <text class="record-desc">{{ item.desc }}</text>
          </view>
          <text class="record-time">{{ item.time }}</text>
        </view>
        <view class="record-actions">
          <text class="record-action" @tap.stop="openRecord(item)">{{ item.primaryAction }}</text>
          <text v-if="item.songId" class="record-action" @tap.stop="practiceSong(item.songId)">开始练习</text>
        </view>
      </view>

      <view v-if="!filteredRecords.length && !loading" class="empty-card">
        <view class="empty-icon">◎</view>
        <view class="empty-title">暂无记录</view>
        <view class="empty-desc">去谱灵页生成、搜谱或练习，记录会自动沉淀在这里。</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/base/AppNavbar.vue'
import AppSearchBar from '@/components/base/AppSearchBar.vue'
import AppTabs from '@/components/base/AppTabs.vue'
import { loginWithWechatProfile } from '@/api/auth'
import { getFavorites } from '@/api/favorites'
import { getRecentPracticeRecords } from '@/api/practice'
import { getMyLikedSongs } from '@/api/social'
import { getMySongs } from '@/api/songs'
import { useAuthStore } from '@/stores/auth'
import type { Song } from '@/types'

interface RecordItem {
  id: string
  type: 'chat' | 'create' | 'search' | 'practice'
  icon: string
  title: string
  desc: string
  time: string
  songId?: string | number
  primaryAction: string
}

const keyword = ref('')
const activeType = ref('all')
const records = ref<RecordItem[]>([])
const loading = ref(false)

const tabs = [
  { label: '全部', value: 'all' },
  { label: '创作', value: 'create' },
  { label: '收藏', value: 'search' },
  { label: '练习', value: 'practice' },
  { label: '点赞', value: 'chat' },
]

const filteredRecords = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return records.value.filter((item) => {
    const matchType = activeType.value === 'all' || item.type === activeType.value
    const matchKey = !key || `${item.title} ${item.desc}`.toLowerCase().includes(key)
    return matchType && matchKey
  })
})

onLoad((query) => {
  if (query?.type) activeType.value = String(query.type)
})

onShow(loadRecords)

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

function songToRecord(song: Song, type: RecordItem['type'], icon: string, action: string): RecordItem {
  return {
    id: `${type}-${song.id}`,
    type,
    icon,
    title: song.title,
    desc: `${song.style || '弹唱'} · ${song.song_key || 'C'}调 · ${song.difficulty || '新手'}`,
    time: '最近',
    songId: song.id,
    primaryAction: action,
  }
}

async function loadRecords() {
  loading.value = true
  try {
    await ensureLogin()
    const [works, favorites, liked, practice] = await Promise.all([
      getMySongs(1, 30),
      getFavorites(1, 30),
      getMyLikedSongs(1, 30),
      getRecentPracticeRecords(1, 30),
    ])

    const workRecords = (works.items || []).map((song) => songToRecord(song, 'create', '♪', '查看曲谱'))
    const favoriteRecords = (favorites.items || []).map((song) => songToRecord(song, 'search', '♡', '查看收藏'))
    const likedRecords = (liked.items || []).map((song) => songToRecord(song, 'chat', '◎', '查看点赞'))
    const practiceRecords = (practice?.items || []).map((item: any) => ({
      id: `practice-${item._id || item.id || item.song_id}`,
      type: 'practice' as const,
      icon: '▶',
      title: `练习 ${item.song_id || '曲谱'}`,
      desc: `${Number(item.duration_seconds || 0)} 秒 · ${item.bpm || 0} BPM · 速度 ${item.scroll_speed || 0}`,
      time: '最近',
      songId: item.song_id,
      primaryAction: '继续练习',
    }))

    records.value = [...workRecords, ...practiceRecords, ...favoriteRecords, ...likedRecords]
  } catch (error) {
    console.log('record load failed', error)
    records.value = []
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

function openRecord(item: RecordItem) {
  if (item.songId) {
    uni.navigateTo({ url: `/pages/song-detail/index?id=${item.songId}` })
  }
}

function practiceSong(songId: string | number) {
  uni.navigateTo({ url: `/pages/practice/index?id=${songId}` })
}
</script>

<style scoped>
.page {
  width: 750rpx;
  min-height: 100vh;
  background: #F6FBF8;
  box-sizing: border-box;
  padding-bottom: 48rpx;
}

.search-section {
  margin-top: 8rpx;
}

.tabs-section {
  margin-top: 24rpx;
}

.record-list {
  margin-top: 32rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.record-card {
  width: 686rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-shadow: 0 8rpx 28rpx rgba(18,52,36,.06);
  animation: recordIn .2s ease-out;
}

.record-top {
  display: flex;
  align-items: flex-start;
}

.record-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  background: #EAF8F0;
  color: #0BA45A;
  font-size: 32rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.record-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.record-title {
  font-size: 30rpx;
  line-height: 40rpx;
  font-weight: 700;
  color: #17231E;
}

.record-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #6B756F;
}

.record-time {
  font-size: 22rpx;
  color: #A4AEA8;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.record-actions {
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #EDF3EF;
  display: flex;
  gap: 16rpx;
}

.record-action {
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #F0FBF5;
  color: #0BA45A;
  font-size: 23rpx;
  font-weight: 600;
}

.empty-card {
  width: 686rpx;
  padding: 72rpx 32rpx;
  border-radius: 28rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 32rpx;
  background: #EAF8F0;
  color: #0BA45A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  font-weight: 800;
}

.empty-title {
  margin-top: 24rpx;
  color: #17231E;
  font-size: 30rpx;
  font-weight: 800;
}

.empty-desc {
  margin-top: 10rpx;
  color: #6B756F;
  font-size: 24rpx;
  text-align: center;
}

@keyframes recordIn {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>