<template>
  <view class="suggestion-card">
    <view class="card-head">
      <view class="icon-box">♪</view>
      <view class="head-main">
        <text class="eyebrow">已找到资源</text>
        <text class="title">{{ candidate.title }}</text>
      </view>
      <view class="score">{{ confidenceText }}</view>
    </view>

    <text v-if="candidate.artist" class="artist">歌手：{{ candidate.artist }}</text>
    <text class="summary">{{ candidate.summary }}</text>

    <view v-if="displayReferences.length" class="refs">
      <view class="refs-head">
        <text class="refs-title">可直接打开的吉他谱资源</text>
        <text class="refs-count">{{ displayReferences.length }}条</text>
      </view>
      <view
        v-for="(item, index) in displayReferences"
        :key="item.url || `${item.title}-${index}`"
        class="ref-item"
        @tap="emit('openResource', item)"
      >
        <image v-if="item.thumbnail_url" class="ref-thumb" :src="item.thumbnail_url" mode="aspectFill" />
        <view v-else class="ref-thumb ref-thumb--empty">谱</view>
        <view class="ref-main">
          <view class="ref-title-row">
            <text class="ref-text">{{ item.title }}</text>
            <text class="type-pill" :class="`type-pill--${getRefType(item)}`">{{ getRefTypeLabel(item) }}</text>
          </view>
          <text class="ref-snippet">{{ item.snippet || item.source_site || item.provider || '公开搜索结果' }}</text>
          <text class="ref-url">{{ item.source_site || item.provider || item.url }}</text>
        </view>
        <view class="open-btn">打开</view>
      </view>
    </view>

    <view class="notice">优先打开上面的网页谱 / 图片谱资源。AI 生成只作为没有可用资源时的兜底。</view>

    <view class="actions">
      <view class="ghost-btn" @tap="emit('back')">返回结果</view>
      <view class="secondary-btn" :class="{ loading }" @tap="emit('generate')">
        {{ loading ? '生成中' : 'AI兜底生成' }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WebSearchReference, WebSongCandidate } from '@/api/webSearch'

const props = withDefaults(defineProps<{
  candidate: WebSongCandidate
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  generate: []
  back: []
  openResource: [resource: WebSearchReference]
}>()

const confidenceText = computed(() => `${Math.round((props.candidate.confidence || 0) * 100)}%`)
const displayReferences = computed(() => (props.candidate.tabReferences?.length ? props.candidate.tabReferences : props.candidate.references || []).slice(0, 8))

function getRefType(ref: WebSearchReference) {
  if (ref.result_type === 'image' || ref.thumbnail_url) return 'image'
  if (ref.result_type === 'text') return 'text'
  if (ref.result_type === 'fallback') return 'fallback'
  return 'web'
}

function getRefTypeLabel(ref: WebSearchReference) {
  const type = getRefType(ref)
  if (type === 'image') return '图片谱'
  if (type === 'text') return 'TXT谱'
  if (type === 'fallback') return '搜索入口'
  return '网页谱'
}
</script>

<style scoped>
.suggestion-card {
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
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.score {
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

.artist,
.summary {
  display: block;
  margin-top: 18rpx;
  color: #5F6B65;
  font-size: 25rpx;
  line-height: 38rpx;
}

.summary {
  margin-top: 12rpx;
}

.refs {
  margin-top: 20rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: #F6FBF8;
}

.refs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.refs-title {
  display: block;
  color: #17231E;
  font-size: 24rpx;
  line-height: 30rpx;
  font-weight: 800;
}

.refs-count {
  color: #0BA45A;
  font-size: 21rpx;
  font-weight: 800;
}

.ref-item {
  margin-top: 14rpx;
  padding: 14rpx;
  border-radius: 18rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  display: flex;
  align-items: center;
}

.ref-thumb {
  width: 82rpx;
  height: 82rpx;
  margin-right: 14rpx;
  border-radius: 14rpx;
  background: #EAF8F0;
  flex-shrink: 0;
}

.ref-thumb--empty {
  color: #0BA45A;
  font-size: 26rpx;
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

.ref-text {
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
  height: 30rpx;
  margin-left: 8rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  line-height: 30rpx;
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

.type-pill--fallback,
.type-pill--web {
  color: #0BA45A;
  background: #EAF8F0;
}

.ref-snippet,
.ref-url {
  display: block;
  margin-top: 5rpx;
  color: #7B8580;
  font-size: 21rpx;
  line-height: 28rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ref-url {
  color: #A0AAA5;
}

.open-btn {
  width: 74rpx;
  height: 48rpx;
  margin-left: 12rpx;
  border-radius: 999rpx;
  background: #0BA45A;
  color: #FFFFFF;
  font-size: 21rpx;
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
  gap: 14rpx;
}

.ghost-btn,
.secondary-btn {
  flex: 1;
  height: 68rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  font-weight: 800;
}

.ghost-btn {
  background: #F6FAF8;
  color: #5F6B65;
  border: 1rpx solid #E8EFEA;
}

.secondary-btn {
  background: #EAF8F0;
  color: #0BA45A;
  border: 1rpx solid #D8F0E4;
}

.secondary-btn.loading {
  opacity: .68;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
