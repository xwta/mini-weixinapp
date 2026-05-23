<template>
  <view class="favorites-page">
    <AppNavBar title="我的收藏" subtitle="收好那些想弹的歌" show-back />

    <view class="container">
      <view v-if="songs.length" class="song-list">
        <view v-for="song in songs" :key="song.id" class="favorite-row">
          <SongCard :song="song" />
          <view class="remove" @tap="handleRemove(song.id)">取消收藏</view>
        </view>
      </view>
      <EmptyState v-else icon="♡" title="还没有收藏" desc="遇到喜欢的谱，就收进歌单里" button-text="去曲谱库" @action="goSongs" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavBar from '../../components/AppNavBar.vue'
import SongCard from '../../components/SongCard.vue'
import EmptyState from '../../components/EmptyState.vue'
import { getFavorites, removeFavorite } from '../../api/favorites'
import { loginWithWechatProfile } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'
import type { Song } from '../../types'

const songs = ref<Song[]>([])

onShow(() => {
  loadFavorites()
})

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

async function loadFavorites() {
  await ensureLogin()
  const res = await getFavorites(1, 50)
  songs.value = res.items
}

async function handleRemove(songId: number | string) {
  await removeFavorite(songId)
  songs.value = songs.value.filter((song) => song.id !== songId)
  uni.showToast({ title: '已取消收藏', icon: 'none' })
}

function goSongs() {
  uni.switchTab({ url: '/pages/songs/index' })
}
</script>

<style scoped lang="scss">
.favorites-page {
  min-height: 100vh;
  background: #fafaf6;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.favorite-row {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.remove {
  align-self: flex-end;
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 28rpx;
  background: #fff;
  color: #e5484d;
  font-size: 24rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
}
</style>
