<template>
  <view class="page">
    <view class="topbar">
      <view class="back" @tap="goBack">‹</view>
      <view class="title-wrap">
        <text class="title">{{ pageTitle }}</text>
        <text class="url">{{ hostLabel }}</text>
      </view>
      <view class="copy" @tap="copyLink">复制</view>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <web-view v-if="url" :src="url" @error="handleError" />
    <!-- #endif -->

    <!-- #ifndef MP-WEIXIN -->
    <view class="fallback">
      <text class="fallback-title">当前环境暂不支持内置网页</text>
      <text class="fallback-desc">已准备好曲谱资源链接，可以复制后在浏览器打开。</text>
      <view class="fallback-btn" @tap="copyLink">复制链接</view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const url = ref('')
const pageTitle = ref('曲谱资源')

const hostLabel = computed(() => {
  try {
    return new URL(url.value).hostname.replace(/^www\./, '')
  } catch (_error) {
    return '网页资源'
  }
})

onLoad((query) => {
  url.value = decodeURIComponent(String(query?.url || ''))
  pageTitle.value = decodeURIComponent(String(query?.title || '曲谱资源'))
  if (!url.value) {
    uni.showToast({ title: '资源链接为空', icon: 'none' })
  }
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.reLaunch({ url: '/pages/chat/index' })
}

function copyLink() {
  if (!url.value) return
  uni.setClipboardData({
    data: url.value,
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
  })
}

function handleError() {
  uni.showModal({
    title: '网页未能打开',
    content: '可能是该网站暂不支持小程序内打开。已为你准备复制链接，可在浏览器中查看。',
    confirmText: '复制链接',
    cancelText: '返回',
    success: (res) => {
      if (res.confirm) copyLink()
      else goBack()
    },
  })
}
</script>

<style scoped>
.page { min-height: 100vh; background: #F6FBF8; }
.topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 10; height: calc(env(safe-area-inset-top) + 96rpx); padding: env(safe-area-inset-top) 24rpx 0; box-sizing: border-box; background: rgba(246, 251, 248, .96); border-bottom: 1rpx solid #E8EFEA; display: flex; align-items: center; }
.back { width: 64rpx; height: 64rpx; border-radius: 999rpx; background: #FFFFFF; color: #17231E; font-size: 48rpx; line-height: 58rpx; text-align: center; box-shadow: 0 8rpx 20rpx rgba(18, 52, 36, .06); flex-shrink: 0; }
.title-wrap { flex: 1; min-width: 0; margin: 0 18rpx; display: flex; flex-direction: column; }
.title { color: #17231E; font-size: 28rpx; line-height: 36rpx; font-weight: 900; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.url { margin-top: 4rpx; color: #7B8580; font-size: 20rpx; line-height: 26rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.copy { height: 56rpx; padding: 0 22rpx; border-radius: 999rpx; color: #0BA45A; background: #EAF8F0; border: 1rpx solid #D8F0E4; font-size: 24rpx; line-height: 56rpx; font-weight: 800; flex-shrink: 0; }
web-view { margin-top: calc(env(safe-area-inset-top) + 96rpx); }
.fallback { padding: calc(env(safe-area-inset-top) + 180rpx) 40rpx 0; display: flex; flex-direction: column; align-items: center; text-align: center; }
.fallback-title { color: #17231E; font-size: 34rpx; font-weight: 900; line-height: 48rpx; }
.fallback-desc { margin-top: 18rpx; color: #7B8580; font-size: 26rpx; line-height: 40rpx; }
.fallback-btn { margin-top: 36rpx; height: 76rpx; padding: 0 44rpx; border-radius: 999rpx; background: #0BA45A; color: #FFFFFF; font-size: 28rpx; line-height: 76rpx; font-weight: 900; }
</style>
