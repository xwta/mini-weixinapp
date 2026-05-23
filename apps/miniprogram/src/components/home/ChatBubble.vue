<template>
  <view class="chat-row" :class="role === 'user' ? 'chat-row--user' : 'chat-row--ai'">
    <view v-if="role === 'ai'" class="avatar">谱</view>
    <view class="bubble" :class="role === 'user' ? 'bubble--user' : 'bubble--ai'">
      <text class="bubble-text">{{ content }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  role?: 'ai' | 'user'
  content: string
}>(), {
  role: 'ai',
})
</script>

<style scoped>
.chat-row {
  width: 686rpx;
  margin: 0 32rpx 24rpx;
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
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  background: #0BA45A;
  color: #FFFFFF;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
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
