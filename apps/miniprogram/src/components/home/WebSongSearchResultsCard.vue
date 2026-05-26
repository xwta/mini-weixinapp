<template>
  <view class="results-card">
    <view class="card-head">
      <view class="icon-box">⌕</view>
      <view class="head-main">
        <text class="eyebrow">{{ sourceLabel }}</text>
        <text class="title">直接搜索到的吉他谱线索</text>
      </view>
      <view class="count">{{ getTotalTabCount() }}条</view>
    </view>

    <view class="result-list">
      <view
        v-for="(item, index) in candidates.slice(0, 5)"
        :key="`${item.title}-${item.artist || ''}-${index}`"
        class="result-item result-item--candidate"
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
            <text v-if="getImageCount(item)" class="meta-pill meta-pill--image">{{ getImageCount(item) }}张图片谱</text>
            <text v-if="item.album" class="meta-pill">{{ item.album }}</text>
          </view>
        </view>
        <view class="choose-btn">生成</view>
      </view>
    </view>

    <view v-if="topReferences.length" class="ref-preview-list">
      <view
        v-for="(ref, index) in topReferences"
        :key="`${ref.url}-${index}`"
        class="ref-preview-item"
        @tap="emit('select', candidates[0])"
      >
        <image v-if="ref.thumbnail_url" class="ref-thumb" :src="ref.thumbnail_url" mode="aspectFill" />
        <view v-else class="ref-thumb ref-thumb--empty">谱</view>
        <view class="ref-main">
          <view class="ref-title-row">
            <text class="ref-title">{{ ref.title }}</text>
            <text class="type-pill" :class="`type-pill--${getRefType(ref)}`">{{ getRefTypeLabel(ref) }}</text>
          </view>
          <text class="ref-snippet">{{ ref.snippet || ref.source_site || ref.provider || '公开网页搜索结果' }}</text>
          <view class="ref-meta-row">
            <text class="ref-provider">{{ ref.source_site || ref.provider || 'web' }}</text>
            <text class="ref-score">{{ Math.round(ref.tab_score || 0) }}分</text>
          </view>
        </view>
      </view>
    </view>

    <view class="notice">展示的是公开搜索结果的标题、摘要、缩略图和来源链接，不存储第三方完整曲谱。</view>

    <view class="actions">
      <view class="ghost-btn" @tap="emit('searchAgain')">换个关键词</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WebSearchReference, WebSongCandidate } from '@/api/webSearch'

const props = withDefaults(defineProps<{
  candidates: WebSongCandidate[]
  sourceLabel?: string
}>(), {
  sourceLabel: '网络吉他谱搜索',
})

const emit = defineEmits<{
  select: [candidate: WebSongCandidate]
  searchAgain: []
}>()

const topReferences = computed(() => {
  const refs = props.candidates.flatMap((item) => item.tabReferences || item.references || [])
  return refs.slice(0, 6)
})

function getConfidenceText(candidate: WebSongCandidate) {
  return `${Math.round((candidate.confidence || 0) * 100)}%`
}

function getTabCount(candidate: WebSongCandidate) {
  return Number(candidate.arrangementHints?.tabReferenceCount || candidate.tabReferences?.length || 0)
}

function getImageCount(candidate: WebSongCandidate) {
  return Number(candidate.arrangementHints?.imageReferenceCount || (candidate.tabReferences || []).filter(item => item.result_type === 'image' || item.thumbnail_url).length || 0)
}

function getTotalTabCount() {
  return props.candidates.reduce((sum, item) => sum + getTabCount(item), 0) || props.candidates.length
}

function getRefType(ref: WebSearchReference) {
  if (ref.result_type === 'image' || ref.thumbnail_url) return 'image'
  if (ref.result_type === 'text') return 'text'
  return 'web'
}

function getRefTypeLabel(ref: WebSearchReference) {
  const type = getRefType(ref)
  if (type === 'image') return '图片谱'
  if (type === 'text') return 'TXT/网页谱'
  return '网页谱'
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

.result-item--candidate {
  border: 1rpx solid #E8EFEA;
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

.meta-pill--image {
  color: #B66D00;
  background: #FFF4DC;
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

.ref-preview-list {
  margin-top: 18rpx;
}

.ref-preview-item {
  margin-top: 14rpx;
  padding: 14rpx;
  border-radius: 20rpx;
  background: #FAFDFB;
  border: 1rpx solid #E8EFEA;
  display: flex;
  align-items: center;
}

.ref-thumb {
  width: 92rpx;
  height: 92rpx;
  margin-right: 16rpx;
  border-radius: 16rpx;
  background: #EAF8F0;
  flex-shrink: 0;
}

.ref-thumb--empty {
  color: #0BA45A;
  font-size: 28rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ref-main {
  flex: 1;
  min-width: 0;
}

.ref-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.ref-title {
  flex: 1;
  min-width: 0;
  color: #17231E;
  font-size: 24rpx;
  line-height: 32rpx;
  font-weight: 800;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.type-pill {
  height: 32rpx;
  margin-left: 10rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  line-height: 32rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.type-pill--image {
  color: #B66D00;
  background: #FFF4DC;
}

.type-pill--text {
  color: #0A7ACC;
  background: #E8F4FF;
}

.type-pill--web {
  color: #0BA45A;
  background: #EAF8F0;
}

.ref-snippet {
  display: block;
  margin-top: 6rpx;
  color: #7B8580;
  font-size: 21rpx;
  line-height: 30rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ref-meta-row {
  margin-top: 8rpx;
  display: flex;
  gap: 10rpx;
}

.ref-provider,
.ref-score {
  color: #9AA49F;
  font-size: 19rpx;
  line-height: 24rpx;
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
