<template>
  <view class="page">
    <AppNavbar title="功能说明" @back="goBack" />

    <view class="content">
      <view class="safe-card">
        <view class="safe-icon">◎</view>
        <view class="safe-title">当前版本免费开放体验</view>
        <view class="safe-desc">谱灵 AI 当前提供搜谱、AI生成曲谱、图片六线谱阅读、收藏和练习记录等工具能力。</view>
      </view>

      <view class="notice-card">
        <view class="notice-title">版本说明</view>
        <view class="notice-text">当前个人主体版本仅开放基础工具体验，相关商业化能力暂不开放。</view>
      </view>

      <view class="primary-btn" @tap="goHome">返回搜谱</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppNavbar from '@/components/base/AppNavbar.vue'

function goHome() {
  uni.reLaunch({ url: '/pages/chat/index' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { width: 750rpx; min-height: 100vh; background: #F6FBF8; padding-bottom: 48rpx; box-sizing: border-box; }
.content { padding: 32rpx; box-sizing: border-box; }
.safe-card { width: 686rpx; padding: 72rpx 36rpx; border-radius: 32rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; text-align: center; }
.safe-icon { width: 104rpx; height: 104rpx; border-radius: 32rpx; background: #EAF8F0; color: #0BA45A; display: flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 900; }
.safe-title { margin-top: 28rpx; color: #17231E; font-size: 34rpx; line-height: 44rpx; font-weight: 900; }
.safe-desc { margin-top: 14rpx; color: #6B756F; font-size: 25rpx; line-height: 40rpx; }
.notice-card { width: 686rpx; margin-top: 24rpx; padding: 26rpx; box-sizing: border-box; border-radius: 24rpx; background: #FFF8E8; color: #9A6714; }
.notice-title { font-size: 27rpx; line-height: 34rpx; font-weight: 900; }
.notice-text { margin-top: 10rpx; font-size: 24rpx; line-height: 38rpx; }
.primary-btn { width: 686rpx; height: 88rpx; margin-top: 32rpx; border-radius: 999rpx; background: #0BA45A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 900; }
</style>