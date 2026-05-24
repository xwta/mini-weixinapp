<template>
  <view class="home-hero-wrap">
    <view class="home-hero">
      <view class="hero-left">
        <view class="hero-logo">
          <text class="logo-mark">♪</text>
          <view class="logo-spark" />
        </view>
        <view class="hero-content">
          <text class="hero-title">谱灵 AI</text>
          <text class="hero-desc">你的 AI 吉他伙伴</text>
        </view>
      </view>

      <view class="record-entry" @tap="emit('openRecord')">
        <text class="record-icon">▣</text>
        <text class="record-text">记录</text>
        <view class="record-dot" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  openRecord: []
}>()
</script>

<style scoped>
.home-hero-wrap {
  width: 750rpx;
  padding: calc(env(safe-area-inset-top) + 44rpx) 32rpx 0;
  box-sizing: border-box;
}

.home-hero {
  width: 686rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.hero-logo {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 26rpx;
  background: linear-gradient(135deg, #0BB861 0%, #0BA45A 54%, #72E49A 100%);
  box-shadow: 0 16rpx 32rpx rgba(16, 177, 90, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-mark {
  color: #FFFFFF;
  font-size: 52rpx;
  line-height: 56rpx;
  font-weight: 800;
}

.logo-spark {
  position: absolute;
  top: 14rpx;
  right: 15rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  box-shadow: 9rpx 7rpx 0 rgba(255, 255, 255, 0.72);
}

.hero-content {
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.hero-title {
  font-size: 46rpx;
  color: #101821;
  font-weight: 800;
  letter-spacing: 1rpx;
  line-height: 56rpx;
}

.hero-desc {
  margin-top: 7rpx;
  font-size: 26rpx;
  color: #707A84;
  line-height: 34rpx;
}

.record-entry {
  position: relative;
  height: 60rpx;
  min-width: 116rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(225, 234, 229, 0.96);
  box-shadow: 0 12rpx 28rpx rgba(23, 35, 30, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.record-icon {
  font-size: 22rpx;
  color: #17231E;
  line-height: 24rpx;
}

.record-text {
  font-size: 25rpx;
  color: #17231E;
  font-weight: 700;
  line-height: 30rpx;
}

.record-dot {
  position: absolute;
  top: -7rpx;
  right: 7rpx;
  width: 13rpx;
  height: 13rpx;
  border-radius: 999rpx;
  background: #FF3B3B;
  border: 3rpx solid #FFFFFF;
}
</style>
