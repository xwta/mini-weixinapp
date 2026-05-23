<template>
  <view class="songs-page">
    <AppNavBar title="搜谱" subtitle="海量吉他谱与 AI 原创" />

    <view class="container">
      <view class="search-card card">
        <input
          v-model="keyword"
          class="search-input"
          confirm-type="search"
          placeholder="搜索歌名 / 歌手 / 风格"
          @confirm="handleSearch"
        />
        <view class="search-btn" @tap="handleSearch">搜索</view>
      </view>

      <scroll-view scroll-x class="filter-bar">
        <view
          v-for="item in difficulties"
          :key="item"
          :class="['chip', difficulty === item && 'active']"
          @tap="selectDifficulty(item)"
        >
          {{ item }}
        </view>
      </scroll-view>

      <view v-if="songs.length" class="song-list">
        <SongCard v-for="song in songs" :key="song.id" :song="song" />
      </view>

      <view v-else class="empty card">没有找到相关曲谱，换个关键词试试</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavBar from '../../components/AppNavBar.vue'
import SongCard from '../../components/SongCard.vue'
import { searchSongs } from '../../api/songs'
import type { Song } from '../../types'

const keyword = ref('')
const difficulty = ref('')
const difficulties = ['新手', '进阶', '专业']
const songs = ref<Song[]>([])

onShow(async () => {
  const pendingKeyword = uni.getStorageSync('PULING_SEARCH_KEYWORD')
  if (pendingKeyword) {
    keyword.value = String(pendingKeyword)
    uni.removeStorageSync('PULING_SEARCH_KEYWORD')
  }
  await load()
})

async function load() {
  const data = await searchSongs({
    keyword: keyword.value,
    difficulty: difficulty.value,
    page_size: 30,
  })
  songs.value = data.items || []
}

async function handleSearch() {
  await load()
}

async function selectDifficulty(item: string) {
  difficulty.value = difficulty.value === item ? '' : item
  await load()
}
</script>

<style scoped lang="scss">
.songs-page {
  min-height: 100vh;
  background: #fafaf6;
}

.search-card {
  margin-top: 8rpx;
  padding: 16rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.search-input {
  flex: 1;
  height: 76rpx;
  border-radius: 38rpx;
  background: #f6f8f7;
  padding: 0 26rpx;
  color: #123c32;
  font-size: 27rpx;
}

.search-btn {
  width: 140rpx;
  height: 76rpx;
  border-radius: 38rpx;
  background: #1e7a5a;
  color: #fff;
  font-size: 28rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-bar {
  white-space: nowrap;
  margin-top: 22rpx;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 60rpx;
  padding: 0 26rpx;
  margin-right: 16rpx;
  border-radius: 30rpx;
  background: #fff;
  color: #687078;
  font-size: 24rpx;
  font-weight: 800;
}

.chip.active {
  background: #1e7a5a;
  color: #fff;
}

.song-list {
  margin-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.empty {
  margin-top: 24rpx;
  padding: 34rpx;
  color: #8b949b;
  font-size: 25rpx;
  text-align: center;
}
</style>
