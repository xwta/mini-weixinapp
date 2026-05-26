<template>
  <view class="suggestion-card">
    <view class="card-head">
      <view class="icon-box">♪</view>
      <view class="head-main">
        <text class="eyebrow">已选择歌曲</text>
        <text class="title">{{ candidate.title }}</text>
      </view>
      <view class="score">{{ confidenceText }}</view>
    </view>

    <text v-if="candidate.artist" class="artist">歌手：{{ candidate.artist }}</text>
    <text class="summary">{{ candidate.summary }}</text>

    <view v-if="candidate.tabReferences?.length || candidate.references?.length" class="refs">
      <text class="refs-title">{{ candidate.tabReferences?.length ? '吉他谱搜索线索' : '参考摘要' }}</text>
      <view
        v-for="(item, index) in displayReferences"
        :key="item.url || `${item.title}-${index}`"
        class="ref-item"
      >
        <text class="ref-dot">{{ index + 1 }}</text>
        <text class="ref-text">{{ item.title }}</text>
      </view>
    </view>

    <view class="notice">确认后才会生成 AI 简化弹唱编配版，不复制第三方完整歌词或现成曲谱。</view>

    <view class="actions">
      <view class="ghost-btn" @tap="emit('back')">返回搜索结果</view>
      <view class="primary-btn" :class="{ loading }" @tap="emit('generate')">
        {{ loading ? '生成中' : 'AI生成吉他谱' }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WebSongCandidate } from '@/api/webSearch'

const props = withDefaults(defineProps<{
  candidate: WebSongCandidate
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  generate: []
  back: []
}>()

const confidenceText = computed(() => `${Math.round((props.candidate.confidence || 0) * 100)}%`)
const displayReferences = computed(() => (props.candidate.tabReferences?.length ? props.candidate.tabReferences : props.candidate.references || []).slice(0, 3))
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

.refs-title {
  display: block;
  color: #17231E;
  font-size: 24rpx;
  line-height: 30rpx;
  font-weight: 800;
}

.ref-item {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
}

.ref-dot {
  width: 34rpx;
  height: 34rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #EAF8F0;
  color: #0BA45A;
  font-size: 20rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ref-text {
  flex: 1;
  min-width: 0;
  color: #5F6B65;
  font-size: 23rpx;
  line-height: 32rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
.primary-btn {
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

.primary-btn {
  background: linear-gradient(135deg, #0BB861 0%, #0BA45A 100%);
  color: #FFFFFF;
  box-shadow: 0 12rpx 24rpx rgba(16, 177, 90, 0.18);
}

.primary-btn.loading {
  opacity: .68;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
