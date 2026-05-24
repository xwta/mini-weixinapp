<template>
  <view class="chat-row" :class="role === 'user' ? 'chat-row--user' : 'chat-row--ai'">
    <view v-if="role === 'ai'" class="avatar">谱</view>

    <view v-if="role === 'ai' && isWelcome" class="assistant-card">
      <text class="assistant-name">谱灵助手</text>
      <text class="assistant-title">今天想玩什么？</text>
      <text class="assistant-copy">可以写歌、搜谱、配和弦，也可以让我带你练。</text>
      <text class="assistant-time">14:50</text>

      <view class="recommend-block">
        <text class="recommend-title">🔥 热门推荐</text>
        <view class="recommend-tags">
          <view
            v-for="item in recommendations"
            :key="item.text"
            class="recommend-tag"
            @tap="emit('selectPrompt', item.prompt)"
          >
            <text class="recommend-icon">{{ item.icon }}</text>
            <text class="recommend-text">{{ item.text }}</text>
          </view>
        </view>
      </view>

      <view class="start-btn" @tap="emit('start')">
        <text class="start-spark">✦</text>
        <text class="start-text">立即开始</text>
        <text class="start-arrow">›</text>
      </view>
    </view>

    <view v-else class="bubble" :class="role === 'user' ? 'bubble--user' : 'bubble--ai'">
      <text class="bubble-text">{{ content }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  role?: 'ai' | 'user'
  content: string
}>(), {
  role: 'ai',
})

const emit = defineEmits<{
  selectPrompt: [prompt: string]
  start: []
}>()

const isWelcome = computed(() => props.content.includes('今天想玩什么'))

const recommendations = [
  { icon: '♪', text: '生成民谣歌词', prompt: '帮我生成一段适合吉他弹唱的民谣歌词，温柔一点' },
  { icon: '♫', text: '五月天风格写歌', prompt: '写一首五月天风格的中文流行摇滚歌，适合吉他弹唱' },
  { icon: '♬', text: '生成指弹谱', prompt: '帮我生成一段适合新手练习的C调指弹谱' },
]
</script>

<style scoped>
.chat-row {
  width: 750rpx;
  padding: 0 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
}

.chat-row--user {
  justify-content: flex-end;
}

.chat-row--ai {
  justify-content: flex-start;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #0BB861 0%, #0BA45A 100%);
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
  box-shadow: 0 12rpx 24rpx rgba(16, 177, 90, 0.18);
}

.assistant-card {
  width: 548rpx;
  padding: 24rpx 28rpx 24rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1rpx solid rgba(232, 239, 234, 0.88);
  box-shadow: 0 18rpx 42rpx rgba(23, 35, 30, 0.05);
  box-sizing: border-box;
}

.assistant-name {
  display: block;
  color: #17231E;
  font-size: 27rpx;
  line-height: 36rpx;
  font-weight: 800;
}

.assistant-title {
  display: block;
  margin-top: 14rpx;
  color: #101821;
  font-size: 32rpx;
  line-height: 42rpx;
  font-weight: 800;
}

.assistant-copy {
  display: block;
  margin-top: 10rpx;
  color: #65717B;
  font-size: 26rpx;
  line-height: 40rpx;
}

.assistant-time {
  display: block;
  margin-top: 14rpx;
  color: #A4AEA8;
  font-size: 22rpx;
  line-height: 26rpx;
}

.recommend-block {
  margin-top: 30rpx;
}

.recommend-title {
  display: block;
  color: #17231E;
  font-size: 27rpx;
  line-height: 34rpx;
  font-weight: 800;
}

.recommend-tags {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.recommend-tag {
  height: 54rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: rgba(246, 248, 247, 0.96);
  border: 1rpx solid #E8EFEA;
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-sizing: border-box;
}

.recommend-icon {
  color: #0BA45A;
  font-size: 24rpx;
  line-height: 28rpx;
  font-weight: 800;
}

.recommend-text {
  color: #17231E;
  font-size: 23rpx;
  line-height: 28rpx;
  font-weight: 600;
}

.start-btn {
  margin-top: 26rpx;
  height: 68rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #0BB861 0%, #0BA45A 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 14rpx 24rpx rgba(16, 177, 90, 0.18);
}

.start-spark {
  margin-right: 10rpx;
  font-size: 25rpx;
  line-height: 28rpx;
}

.start-text {
  font-size: 28rpx;
  line-height: 34rpx;
  font-weight: 800;
}

.start-arrow {
  position: absolute;
  right: 24rpx;
  top: 13rpx;
  font-size: 40rpx;
  line-height: 40rpx;
}

.bubble {
  max-width: 520rpx;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  box-sizing: border-box;
}

.bubble--ai {
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  border-top-left-radius: 8rpx;
}

.bubble--user {
  background: #0BA45A;
  border-top-right-radius: 8rpx;
}

.bubble-text {
  font-size: 28rpx;
  line-height: 42rpx;
  color: #17231E;
}

.bubble--user .bubble-text {
  color: #FFFFFF;
}
</style>
