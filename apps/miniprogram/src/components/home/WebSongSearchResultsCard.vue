<template>
  <view class="results-card">
    <view class="card-head">
      <view class="icon-box">⌕</view>
      <view class="head-main">
        <text class="eyebrow">{{ sourceLabel }}</text>
        <text class="title">先确认你要找的歌曲</text>
      </view>
      <view class="count">{{ candidates.length }}首</view>
    </view>

    <view class="result-list">
      <view
        v-for="(item, index) in candidates.slice(0, 5)"
        :key="`${item.title}-${item.artist || ''}-${index}`"
        class="result-item"
        @tap="emit('select', item)"
      >
        <view class="rank">{{ index + 1 }}</view>
        <view class="song-main">
          <view class="song-title-row">
            <text class="song-title">{{ item.title }}</text>
            <text class="score">{{ getConfidenceText(item) }}</text>
          </view>
          <text v-if="item.artist" class="artist">{{ item.artist }}</text>
          <text class="summary">{{ item.summary || getFallbackSummary(item) }}</text>
          <view class="meta-row">
            <text class="meta-pill">{{ item.source || 'web' }}</text>
            <text v-if="getTabCount(item)" class="meta-pill meta-pill--hot">{{ getTabCount(item) }}条谱线索</text>
            <text v-if="item.album" class="meta-pill">{{ item.album }}</text>
          </view>
        </view>
        <view class="choose-btn">选择</view>
      </view>
    </view>

    <view class="notice">这里只是搜索结果。选择歌曲后，才会出现 AI 生成按钮。</view>

    <view class="actions">
      <view class="ghost-btn" @tap="emit('searchAgain')">换个关键词</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { WebSongCandidate } from '@/api/webSearch'

withDefaults(defineProps<{
  candidates: WebSongCandidate[]
  sourceLabel?: string
}>(), {
  sourceLabel: '网络搜索结果',
})

const emit = defineEmits<{
  select: [candidate: WebSongCandidate]
  searchAgain: []
}>()

function getConfidenceText(candidate: WebSongCandidate) {
  return `${Math.round((candidate.confidence || 0) * 100)}%`
}

function getTabCount(candidate: WebSongCandidate) {
  return Number(candidate.arrangementHints?.tabReferenceCount || candidate.tabReferences?.length || 0)
}

function getFallbackSummary(candidate: WebSongCandidate) {
  return candidate.artist ? `识别到《${candidate.title}》 - ${candidate.artist}` : `识别到《${candidate.title}》`
}
</script>

<style scoped>
.results-card {
  width: 686rpx;
  margin: 0 32rpx 24rpx;
  padding: 24rpx;
  box-sizing: border-box;
  border-radius: 28rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-shadow: 0 12rpx 34rpx rgba(18, 52, 36, 0.06);
  animation: cardIn .22s ease-out;
}

.card-head {
  display: flex;
  align-items: center;
}

.icon-box {
  width: 72rpx;
  height: 72rpx;
  margin-right: 18rpx;
  border-radius: 24rpx;
  background: #EAF8F0;
  color: #0BA45A;
  font-size: 36rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.eyebrow {
  color: #0BA45A;
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 800;
}

.title {
  margin-top: 6rpx;
  color: #17231E;
  font-size: 31rpx;
  line-height: 40rpx;
  font-weight: 900;
}

.count {
  min-width: 72rpx;
  height: 48rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: #F0FBF5;
  color: #0BA45A;
  font-size: 22rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.result-list {
  margin-top: 22rpx;
}

.result-item {
  margin-top: 14rpx;
  padding: 18rpx;
  border-radius: 22rpx;
  background: #F6FBF8;
  display: flex;
  align-items: center;
}

.rank {
  width: 42rpx;
  height: 42rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  background: #EAF8F0;
  color: #0BA45A;
  font-size: 22rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.song-main {
  flex: 1;
  min-width: 0;
}

.song-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.song-title {
  flex: 1;
  min-width: 0;
  color: #17231E;
  font-size: 28rpx;
  line-height: 36rpx;
  font-weight: 900;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.score {
  margin-left: 10rpx;
  color: #0BA45A;
  font-size: 21rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.artist,
.summary {
  display: block;
  margin-top: 6rpx;
  color: #5F6B65;
  font-size: 23rpx;
  line-height: 32rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.summary {
  color: #7B8580;
}

.meta-row {
  margin-top: 10rpx;
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.meta-pill {
  max-width: 220rpx;
  height: 34rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  color: #5F6B65;
  font-size: 19rpx;
  line-height: 34rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.meta-pill--hot {
  color: #0BA45A;
  background: #EAF8F0;
}

.choose-btn {
  width: 84rpx;
  height: 52rpx;
  margin-left: 14rpx;
  border-radius: 999rpx;
  background: #0BA45A;
  color: #FFFFFF;
  font-size: 22rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notice {
  margin-top: 18rpx;
  color: #A06A15;
  background: #FFF8E8;
  border-radius: 18rpx;
  padding: 14rpx 18rpx;
  font-size: 22rpx;
  line-height: 32rpx;
}

.actions {
  margin-top: 22rpx;
  display: flex;
}

.ghost-btn {
  flex: 1;
  height: 68rpx;
  border-radius: 999rpx;
  background: #F6FAF8;
  color: #5F6B65;
  border: 1rpx solid #E8EFEA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  font-weight: 800;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
