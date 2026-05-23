<template>
  <view class="page">
    <AppNavBar title="用户主页" show-back />
    <view class="container">
      <view class="card">
        <view class="avatar">🎸</view>
        <view class="name">{{ profile?.user.nickname || '谱友' }}</view>
        <view class="stats">
          <view>{{ profile?.stats.works_count || 0 }}作品</view>
          <view>{{ profile?.stats.followers_count || 0 }}粉丝</view>
          <view>{{ profile?.stats.likes_count || 0 }}获赞</view>
        </view>
      </view>
      <SongCard v-for="song in songs" :key="song.id" :song="song" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavBar from '../../components/AppNavBar.vue'
import SongCard from '../../components/SongCard.vue'
import { getUserProfile, getUserSongs, type UserProfile } from '../../api/social'
import type { Song } from '../../types'

const profile = ref<UserProfile | null>(null)
const songs = ref<Song[]>([])

onLoad(async (query) => {
  const id = String(query?.id || '')
  if (!id) return

  profile.value = await getUserProfile(id)
  songs.value = (await getUserSongs(id)).items
})
</script>

<style scoped>
.page { min-height: 100vh; background: #fafaf6; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 44rpx; background: #e8f7f0; display: flex; align-items: center; justify-content: center; }
.name { margin-top: 12rpx; color: #123c32; font-size: 32rpx; font-weight: 900; }
.stats { margin-top: 12rpx; display: flex; gap: 24rpx; color: #687078; font-size: 24rpx; }
</style>
