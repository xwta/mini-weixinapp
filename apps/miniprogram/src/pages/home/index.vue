<template>
  <view class="home">
    <AppNavBar title="谱灵 AI" subtitle="让灵感变成能弹唱的歌" />

    <view class="container page-content">
      <view class="search" @tap="goSongs">
        <text class="search-placeholder">搜索歌曲 / 输入灵感</text>
        <text class="search-plus">＋</text>
      </view>

      <view class="hero card">
        <view class="hero-text">
          <view class="hero-title">让 AI 帮你写一首</view>
          <view class="hero-title">能弹唱的歌</view>
          <view class="hero-desc">输入灵感，生成歌词、和弦和吉他谱</view>
          <view class="hero-btn" @tap="goCreate">开始创作</view>
        </view>
        <view class="hero-art">♪</view>
      </view>

      <view class="quick-grid">
        <view v-for="item in quickActions" :key="item.title" class="quick-card" @tap="item.action">
          <view class="quick-icon">{{ item.icon }}</view>
          <view class="quick-title">{{ item.title }}</view>
        </view>
      </view>

      <view class="section-title">今日灵感</view>
      <view class="inspiration card" @tap="goCreateWithPrompt">
        <view class="inspiration-icon">✦</view>
        <view class="inspiration-main">
          <view class="inspiration-title">毕业那天没说出口的话</view>
          <view class="inspiration-meta">校园民谣 · C调 · 新手友好</view>
        </view>
        <view class="small-btn">生成</view>
      </view>

      <view class="section-title">新手必弹</view>
      <view class="lesson-grid">
        <view class="lesson card">
          <view class="lesson-title">四和弦弹唱</view>
          <view class="lesson-desc">C G Am F</view>
        </view>
        <view class="lesson card">
          <view class="lesson-title">右手节奏</view>
          <view class="lesson-desc">扫弦入门</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppNavBar from '../../components/AppNavBar.vue'

const quickActions = [
  { title: 'AI写歌', icon: '✎', action: goCreate },
  { title: '配和弦', icon: '♬', action: goCreate },
  { title: '吉他谱', icon: '☰', action: goSongs },
  { title: '练习', icon: '♩', action: goSongs },
]

function goCreate() {
  uni.switchTab({ url: '/pages/create/index' })
}

function goSongs() {
  uni.switchTab({ url: '/pages/songs/index' })
}

function goCreateWithPrompt() {
  uni.setStorageSync('PULING_DRAFT_PROMPT', '写一首关于毕业、夏天和遗憾的校园民谣')
  uni.switchTab({ url: '/pages/create/index' })
}
</script>

<style scoped lang="scss">
.home {
  min-height: 100vh;
  background: #fafaf6;
}

.page-content {
  padding-top: 8rpx;
}

.search {
  height: 96rpx;
  padding: 0 28rpx;
  border-radius: 48rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-placeholder {
  color: #a0a7ae;
  font-size: 28rpx;
}

.search-plus {
  width: 48rpx;
  height: 48rpx;
  border-radius: 24rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 800;
}

.hero {
  margin-top: 32rpx;
  min-height: 330rpx;
  padding: 36rpx;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
}

.hero-title {
  color: #123c32;
  font-size: 48rpx;
  font-weight: 900;
  line-height: 1.25;
}

.hero-desc {
  margin-top: 20rpx;
  color: #687078;
  font-size: 26rpx;
}

.hero-btn {
  margin-top: 30rpx;
  width: 216rpx;
  height: 76rpx;
  border-radius: 38rpx;
  background: #1e7a5a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 800;
}

.hero-art {
  width: 142rpx;
  height: 142rpx;
  border-radius: 70rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 74rpx;
  font-weight: 900;
}

.quick-grid {
  margin-top: 32rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.quick-card {
  height: 156rpx;
  border-radius: 32rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
}

.quick-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 26rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.quick-title {
  color: #123c32;
  font-size: 24rpx;
  font-weight: 800;
}

.inspiration {
  padding: 28rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.inspiration-icon {
  width: 108rpx;
  height: 92rpx;
  border-radius: 28rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  font-weight: 900;
}

.inspiration-main {
  flex: 1;
}

.inspiration-title {
  color: #123c32;
  font-size: 30rpx;
  font-weight: 900;
}

.inspiration-meta {
  margin-top: 12rpx;
  color: #687078;
  font-size: 24rpx;
}

.small-btn {
  height: 52rpx;
  padding: 0 26rpx;
  border-radius: 26rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  font-size: 24rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
}

.lesson-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.lesson {
  height: 160rpx;
  padding: 28rpx;
}

.lesson-title {
  color: #123c32;
  font-size: 30rpx;
  font-weight: 900;
}

.lesson-desc {
  margin-top: 18rpx;
  color: #687078;
  font-size: 26rpx;
}
</style>
