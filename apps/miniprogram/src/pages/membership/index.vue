<template>
  <view class="benefits-page">
    <AppNavBar title="功能说明" subtitle="当前版本免费开放体验" show-back />

    <view class="container">
      <view class="hero-card">
        <view class="hero-title">谱灵 AI 工具说明</view>
        <view class="hero-desc">当前小程序为免费体验版本，可使用搜谱、AI生成TXT谱、图片六线谱和调音功能。</view>
        <view class="hero-pill">免费体验 · 工具服务</view>
      </view>

      <view class="section-title">当前可用能力</view>
      <view class="benefit-list">
        <view v-for="item in benefits" :key="item.title" class="benefit-card">
          <view class="benefit-icon">{{ item.icon }}</view>
          <view class="benefit-main">
            <view class="benefit-title">{{ item.title }}</view>
            <view class="benefit-desc">{{ item.desc }}</view>
          </view>
        </view>
      </view>

      <view class="notice-card">
        <view class="notice-title">说明</view>
        <view class="notice-text">当前版本仅开放基础工具体验，相关商业化能力暂不开放。</view>
      </view>

      <view class="primary-btn" @tap="goCreate">开始搜谱</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppNavBar from '../../components/AppNavBar.vue'

const benefits = [
  { icon: '⌕', title: 'AI搜谱', desc: '输入歌名或歌手，查找可参考的曲谱资源。' },
  { icon: '♪', title: 'TXT谱生成', desc: '根据歌曲信息生成可练习的TXT弹唱谱。' },
  { icon: '▤', title: '图片六线谱', desc: '生成适合上下滚动阅读的六线谱页面。' },
  { icon: '♬', title: '调音器', desc: '辅助吉他标准音调音练习。' },
]

function goCreate() {
  uni.reLaunch({ url: '/pages/chat/index' })
}
</script>

<style scoped lang="scss">
.benefits-page { min-height: 100vh; background: #F6FBF8; padding-bottom: 120rpx; }
.container { padding: 24rpx 32rpx 0; box-sizing: border-box; }
.hero-card { width: 686rpx; padding: 42rpx; box-sizing: border-box; border-radius: 36rpx; background: #123c32; color: #FFFFFF; }
.hero-title { color: #FFF3CF; font-size: 44rpx; line-height: 56rpx; font-weight: 900; }
.hero-desc { margin-top: 18rpx; color: #E8F7F0; font-size: 27rpx; line-height: 42rpx; }
.hero-pill { margin-top: 28rpx; display: inline-flex; height: 58rpx; padding: 0 26rpx; border-radius: 999rpx; background: #FFF3CF; color: #123c32; font-size: 24rpx; font-weight: 900; align-items: center; }
.section-title { margin: 34rpx 0 18rpx; color: #17231E; font-size: 31rpx; line-height: 40rpx; font-weight: 900; }
.benefit-list { display: flex; flex-direction: column; gap: 18rpx; }
.benefit-card { width: 686rpx; padding: 26rpx 24rpx; box-sizing: border-box; border-radius: 26rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; display: flex; align-items: center; }
.benefit-icon { width: 72rpx; height: 72rpx; margin-right: 20rpx; border-radius: 22rpx; background: #EAF8F0; color: #0BA45A; font-size: 32rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.benefit-main { flex: 1; min-width: 0; }
.benefit-title { color: #17231E; font-size: 28rpx; line-height: 36rpx; font-weight: 900; }
.benefit-desc { margin-top: 8rpx; color: #6B756F; font-size: 24rpx; line-height: 36rpx; }
.notice-card { width: 686rpx; margin-top: 26rpx; padding: 26rpx; box-sizing: border-box; border-radius: 26rpx; background: #FFF8E8; color: #9A6714; }
.notice-title { font-size: 27rpx; line-height: 34rpx; font-weight: 900; }
.notice-text { margin-top: 10rpx; font-size: 24rpx; line-height: 38rpx; }
.primary-btn { width: 686rpx; height: 88rpx; margin-top: 34rpx; border-radius: 999rpx; background: #0BA45A; color: #FFFFFF; font-size: 29rpx; line-height: 88rpx; text-align: center; font-weight: 900; }
</style>