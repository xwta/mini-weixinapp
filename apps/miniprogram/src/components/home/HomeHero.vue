<template>
  <view class="home-hero-wrap">
    <view class="home-hero">
      <view class="hero-logo">
        <text class="logo-mark">♪</text>
      </view>
      <view class="hero-content">
        <text class="hero-title">谱灵 AI</text>
        <text class="hero-desc">你的 AI 吉他伙伴</text>
      </view>
      <view class="record-entry" @tap="emit('openRecord')">
        <text class="record-text">记录</text>
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
.home-hero-wrap{
  width:750rpx;
  padding-top:calc(env(safe-area-inset-top) + 76rpx);
  box-sizing:border-box;
}

.home-hero{
  width:686rpx;
  margin:0 32rpx;
  padding:28rpx 24rpx;
  box-sizing:border-box;
  border-radius:32rpx;
  background:linear-gradient(135deg,#EAF8F0 0%,#FFFFFF 100%);
  border:1rpx solid #E8EFEA;
  display:flex;
  align-items:center;
}

.hero-logo{
  width:88rpx;
  height:88rpx;
  border-radius:28rpx;
  background:#0BA45A;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-right:20rpx;
  flex-shrink:0;
}

.logo-mark{
  color:#FFFFFF;
  font-size:44rpx;
  font-weight:800;
}

.hero-content{
  flex:1;
  min-width:0;
  display:flex;
  flex-direction:column;
}

.hero-title{
  font-size:36rpx;
  color:#17231E;
  font-weight:800;
  line-height:48rpx;
}

.hero-desc{
  margin-top:6rpx;
  font-size:24rpx;
  color:#6B756F;
}

.record-entry{
  height:56rpx;
  padding:0 22rpx;
  border-radius:999rpx;
  background:#FFFFFF;
  border:1rpx solid #E1EAE5;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}

.record-text{
  font-size:24rpx;
  color:#0BA45A;
  font-weight:700;
}
</style>