<template>
  <view class="home">
    <AppNavBar title="谱灵 AI" subtitle="搜谱、建谱、练谱，一把吉他就开场" />

    <view class="container page-content">
      <view class="search" @tap="goSongs">
        <text class="search-placeholder">搜索歌曲 / 歌手 / 吉他谱</text>
        <text class="search-icon">⌕</text>
      </view>

      <view class="hero card">
        <view>
          <view class="hero-kicker">曲谱社区 + AI 创作</view>
          <view class="hero-title">今天想弹哪一首？</view>
          <view class="hero-desc">搜热门谱，手动建谱，也可以让 AI 帮你写一首能弹唱的歌。</view>
          <view class="hero-actions">
            <view class="hero-btn" @tap="goSongs">去搜谱</view>
            <view class="hero-btn ghost" @tap="goManualCreate">手动建谱</view>
          </view>
        </view>
        <view class="hero-art">🎸</view>
      </view>

      <view class="quick-grid">
        <view v-for="item in quickActions" :key="item.title" class="quick-card" @tap="item.action">
          <view class="quick-icon">{{ item.icon }}</view>
          <view class="quick-title">{{ item.title }}</view>
        </view>
      </view>

      <view class="section-head">
        <view class="section-title">热门吉他谱</view>
        <view class="more" @tap="goSongs">更多</view>
      </view>
      <view class="rank-list card">
        <view v-for="(item,index) in hotSongs" :key="item.title" class="rank-item" @tap="goSongsWithKeyword(item.title)">
          <view class="rank-no">{{ index + 1 }}</view>
          <view class="rank-main">
            <view class="rank-title">{{ item.title }}</view>
            <view class="rank-meta">{{ item.artist }} · {{ item.difficulty }} · {{ item.key }}调</view>
          </view>
          <view class="rank-like">👍 {{ item.likes }}</view>
        </view>
      </view>

      <view class="section-head">
        <view class="section-title">新手友好</view>
        <view class="more" @tap="goSongs">全部</view>
      </view>
      <scroll-view scroll-x class="beginner-scroll">
        <view v-for="item in beginnerSongs" :key="item.title" class="beginner-card" @tap="goSongsWithKeyword(item.title)">
          <view class="beginner-tag">{{ item.chords }}</view>
          <view class="beginner-title">{{ item.title }}</view>
          <view class="beginner-desc">{{ item.desc }}</view>
        </view>
      </scroll-view>

      <view class="section-head">
        <view class="section-title">AI 原创灵感</view>
        <view class="more" @tap="goCreate">生成</view>
      </view>
      <view class="inspiration card" @tap="goCreateWithPrompt">
        <view class="inspiration-icon">✦</view>
        <view class="inspiration-main">
          <view class="inspiration-title">毕业那天没说出口的话</view>
          <view class="inspiration-meta">校园民谣 · C调 · 新手友好</view>
        </view>
        <view class="small-btn">AI生成</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppNavBar from '../../components/AppNavBar.vue'

const quickActions = [
  { title: '搜谱', icon: '⌕', action: goSongs },
  { title: '手动建谱', icon: '✍', action: goManualCreate },
  { title: 'AI写歌', icon: '✦', action: goCreate },
  { title: '练习', icon: '♩', action: goSongs },
]

const hotSongs = [
  { title: '晴天', artist: '周杰伦', difficulty: '新手', key: 'G', likes: 1280 },
  { title: '成都', artist: '赵雷', difficulty: '新手', key: 'C', likes: 964 },
  { title: '后来', artist: '刘若英', difficulty: '进阶', key: 'C', likes: 821 },
]

const beginnerSongs = [
  { title: '四和弦弹唱', chords: 'C G Am F', desc: '入门万能走向' },
  { title: '校园民谣模板', chords: 'G D Em C', desc: '适合清爽叙事' },
  { title: '慢歌扫弦', chords: 'Am F C G', desc: '适合抒情段落' },
]

function goCreate() { uni.switchTab({ url: '/pages/create/index' }) }
function goSongs() { uni.switchTab({ url: '/pages/songs/index' }) }
function goManualCreate() { uni.navigateTo({ url: '/pages/manual-create/index' }) }
function goSongsWithKeyword(keyword: string) {
  uni.setStorageSync('PULING_SEARCH_KEYWORD', keyword)
  uni.switchTab({ url: '/pages/songs/index' })
}
function goCreateWithPrompt() {
  uni.setStorageSync('PULING_DRAFT_PROMPT', '写一首关于毕业、夏天和遗憾的校园民谣')
  uni.switchTab({ url: '/pages/create/index' })
}
</script>

<style scoped lang="scss">
.home { min-height: 100vh; background: #fafaf6; }
.page-content { padding-top: 8rpx; }
.search { height: 96rpx; padding: 0 28rpx; border-radius: 48rpx; background: #fff; display: flex; align-items: center; justify-content: space-between; }
.search-placeholder { color: #a0a7ae; font-size: 28rpx; }
.search-icon { width: 54rpx; height: 54rpx; border-radius: 27rpx; background: #e8f7f0; color: #1e7a5a; display: flex; align-items: center; justify-content: center; font-size: 34rpx; font-weight: 900; }
.hero { margin-top: 32rpx; padding: 38rpx; display: flex; justify-content: space-between; gap: 20rpx; overflow: hidden; }
.hero-kicker { color: #1e7a5a; font-size: 24rpx; font-weight: 900; }
.hero-title { margin-top: 12rpx; color: #123c32; font-size: 50rpx; font-weight: 900; line-height: 1.2; }
.hero-desc { margin-top: 18rpx; color: #687078; font-size: 26rpx; line-height: 1.55; }
.hero-actions { margin-top: 28rpx; display: flex; gap: 18rpx; }
.hero-btn { height: 72rpx; padding: 0 28rpx; border-radius: 36rpx; background: #1e7a5a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 900; }
.hero-btn.ghost { background: #e8f7f0; color: #1e7a5a; }
.hero-art { width: 126rpx; height: 126rpx; border-radius: 48rpx; background: #e8f7f0; display: flex; align-items: center; justify-content: center; font-size: 62rpx; }
.quick-grid { margin-top: 28rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18rpx; }
.quick-card { height: 150rpx; border-radius: 32rpx; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14rpx; }
.quick-icon { width: 54rpx; height: 54rpx; border-radius: 27rpx; background: #e8f7f0; color: #1e7a5a; display: flex; align-items: center; justify-content: center; font-weight: 900; }
.quick-title { color: #123c32; font-size: 23rpx; font-weight: 800; }
.section-head { margin: 42rpx 0 18rpx; display: flex; align-items: center; justify-content: space-between; }
.section-title { color: #123c32; font-size: 36rpx; font-weight: 900; }
.more { color: #1e7a5a; font-size: 24rpx; font-weight: 900; }
.rank-list { padding: 12rpx 26rpx; }
.rank-item { min-height: 104rpx; display: flex; align-items: center; gap: 20rpx; border-bottom: 1px solid #f1f2f3; }
.rank-item:last-child { border-bottom: none; }
.rank-no { width: 44rpx; height: 44rpx; border-radius: 22rpx; background: #fff3cf; color: #8a5a24; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 900; }
.rank-main { flex: 1; }
.rank-title { color: #123c32; font-size: 30rpx; font-weight: 900; }
.rank-meta { margin-top: 8rpx; color: #687078; font-size: 23rpx; }
.rank-like { color: #a0a7ae; font-size: 22rpx; }
.beginner-scroll { white-space: nowrap; }
.beginner-card { display: inline-flex; flex-direction: column; width: 260rpx; min-height: 166rpx; margin-right: 20rpx; padding: 26rpx; border-radius: 34rpx; background: #fff; }
.beginner-tag { align-self: flex-start; padding: 8rpx 16rpx; border-radius: 18rpx; background: #e8f7f0; color: #1e7a5a; font-size: 22rpx; font-weight: 900; }
.beginner-title { margin-top: 18rpx; color: #123c32; font-size: 30rpx; font-weight: 900; }
.beginner-desc { margin-top: 8rpx; color: #687078; font-size: 24rpx; }
.inspiration { padding: 28rpx; display: flex; align-items: center; gap: 24rpx; }
.inspiration-icon { width: 108rpx; height: 92rpx; border-radius: 28rpx; background: #e8f7f0; color: #1e7a5a; display: flex; align-items: center; justify-content: center; font-size: 42rpx; font-weight: 900; }
.inspiration-main { flex: 1; }
.inspiration-title { color: #123c32; font-size: 30rpx; font-weight: 900; }
.inspiration-meta { margin-top: 12rpx; color: #687078; font-size: 24rpx; }
.small-btn { height: 52rpx; padding: 0 22rpx; border-radius: 26rpx; background: #e8f7f0; color: #1e7a5a; font-size: 24rpx; font-weight: 900; display: flex; align-items: center; }
</style>
