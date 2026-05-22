<template>
  <view class="song-card" @tap="openDetail">
    <view class="cover">
      <text>♪</text>
    </view>
    <view class="content">
      <view class="title">{{ song.title }}</view>
      <view class="meta">{{ song.style || 'AI 原创' }} · {{ song.song_key || 'C' }}调 · {{ song.difficulty || '新手' }}</view>
      <view class="tags">
        <text class="tag">{{ song.source_type === 'ai' ? 'AI原创' : '用户作品' }}</text>
        <text class="count">{{ song.favorite_count }} 收藏 · {{ song.view_count }} 浏览</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Song } from '../types'

const props = defineProps<{ song: Song }>()

function openDetail() {
  uni.navigateTo({ url: `/pages/song-detail/index?id=${props.song.id}` })
}
</script>

<style scoped lang="scss">
.song-card {
  padding: 28rpx;
  border-radius: 32rpx;
  background: #fff;
  display: flex;
  gap: 24rpx;
  box-shadow: 0 16rpx 48rpx rgba(18, 60, 50, 0.06);
}

.cover {
  width: 112rpx;
  height: 112rpx;
  border-radius: 28rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52rpx;
  font-weight: 900;
}

.content {
  flex: 1;
  min-width: 0;
}

.title {
  color: #123c32;
  font-size: 32rpx;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin-top: 12rpx;
  color: #687078;
  font-size: 24rpx;
}

.tags {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.tag {
  padding: 8rpx 16rpx;
  border-radius: 18rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  font-size: 22rpx;
  font-weight: 800;
}

.count {
  color: #a0a7ae;
  font-size: 22rpx;
}
</style>
