<template>
  <view class="songs-page">
    <AppNavBar title="曲谱库" subtitle="发现可弹唱的 AI 原创谱" />

    <view class="container">
      <view class="search-card">
        <input v-model="keyword" class="search-input" placeholder="搜索歌名 / 风格" confirm-type="search" @confirm="handleSearch" />
        <view class="search-btn" @tap="handleSearch">搜索</view>
      </view>

      <view class="tabs">
        <view :class="['tab', activeTab === 'public' && 'active']" @tap="switchTab('public')">公开曲谱</view>
        <view :class="['tab', activeTab === 'mine' && 'active']" @tap="switchTab('mine')">我的作品</view>
      </view>

      <view v-if="songs.length" class="song-list">
        <SongCard v-for="song in songs" :key="song.id" :song="song" />
      </view>
      <EmptyState
        v-else
        icon="♪"
        :title="activeTab === 'mine' ? '还没有作品' : '暂无公开曲谱'"
        :desc="activeTab === 'mine' ? '去 AI 创作生成你的第一首弹唱歌' : '换个关键词试试，或者先生成一首原创作品'"
        button-text="去创作"
        @action="goCreate"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavBar from '../../components/AppNavBar.vue'
import SongCard from '../../components/SongCard.vue'
import EmptyState from '../../components/EmptyState.vue'
import { getMySongs, searchSongs } from '../../api/songs'
import { loginWithWechatProfile } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'
import type { Song } from '../../types'

const keyword = ref('')
const activeTab = ref<'public' | 'mine'>('public')
const songs = ref<Song[]>([])
const loading = ref(false)

onShow(() => {
  loadSongs()
})

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

async function loadSongs() {
  if (loading.value) return
  loading.value = true
  try {
    if (activeTab.value === 'mine') {
      await ensureLogin()
      const res = await getMySongs(1, 30)
      songs.value = res.items
    } else {
      const res = await searchSongs(keyword.value, 1, 30)
      songs.value = res.items
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  activeTab.value = 'public'
  loadSongs()
}

function switchTab(tab: 'public' | 'mine') {
  activeTab.value = tab
  loadSongs()
}

function goCreate() {
  uni.switchTab({ url: '/pages/create/index' })
}
</script>

<style scoped lang="scss">
.songs-page {
  min-height: 100vh;
  background: #fafaf6;
}

.search-card {
  height: 92rpx;
  padding: 0 12rpx 0 30rpx;
  border-radius: 46rpx;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.search-input {
  flex: 1;
  color: #1f2428;
  font-size: 28rpx;
}

.search-btn {
  width: 120rpx;
  height: 68rpx;
  border-radius: 34rpx;
  background: #1e7a5a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 800;
}

.tabs {
  margin-top: 28rpx;
  height: 82rpx;
  padding: 8rpx;
  border-radius: 41rpx;
  background: #fff;
  display: flex;
}

.tab {
  flex: 1;
  border-radius: 34rpx;
  color: #687078;
  font-size: 28rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab.active {
  background: #e8f7f0;
  color: #1e7a5a;
}

.song-list {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
</style>
