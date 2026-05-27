<template>
  <view class="page">
    <view class="profile-card">
      <view class="avatar">{{ avatarText }}</view>
      <view class="profile-main">
        <text class="nickname">{{ auth.user?.nickname || '谱灵用户' }}</text>
        <text class="desc">{{ auth.isLoggedIn ? '吉他谱练习与创作中心' : '登录后同步作品、收藏和创作记录' }}</text>
      </view>
      <view class="edit-btn" @tap="auth.isLoggedIn ? refreshUser() : handleLogin()">{{ auth.isLoggedIn ? '同步' : '登录' }}</view>
    </view>

    <view class="quick-card">
      <view v-if="FEATURES.ENABLE_TAB_SEARCH" class="quick-item" @tap="goMain('/pages/chat/index')">
        <text class="quick-icon">⌕</text>
        <text class="quick-title">搜谱</text>
        <text class="quick-desc">TXT / 图片谱</text>
      </view>
      <view v-if="FEATURES.ENABLE_TUNER" class="quick-item" @tap="goMain('/pages/community/index')">
        <text class="quick-icon">♬</text>
        <text class="quick-title">调音</text>
        <text class="quick-desc">麦克风识别</text>
      </view>
      <view class="quick-item" @tap="openMenu('/pages/record/index?type=practice')">
        <text class="quick-icon">▶</text>
        <text class="quick-title">练习</text>
        <text class="quick-desc">继续弹唱</text>
      </view>
    </view>

    <view v-if="FEATURES.ENABLE_AI_GENERATE" class="quota-card">
      <view>
        <text class="quota-title">AI 创作额度</text>
        <text class="quota-desc">今日还可生成 {{ auth.user?.generation_quota || 0 }} 次</text>
      </view>
      <view class="quota-action">免费体验</view>
    </view>

    <view class="stats-row">
      <view class="stat-item">
        <text class="stat-num">{{ stats.works }}</text>
        <text class="stat-label">作品</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ stats.favorites }}</text>
        <text class="stat-label">收藏</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ recentImports.length }}</text>
        <text class="stat-label">最近</text>
      </view>
    </view>

    <view v-if="recentImports.length" class="section-card">
      <view class="section-head">
        <text class="section-title">最近曲谱</text>
        <text class="section-action" @tap="clearImports">清空</text>
      </view>
      <view v-for="item in recentImports.slice(0, 4)" :key="item.songId" class="recent-item" @tap="openSong(item.songId)">
        <view class="recent-icon">谱</view>
        <view class="recent-main">
          <text class="recent-title">{{ item.title }}</text>
          <text class="recent-desc">{{ item.artist || item.source || '应用内曲谱' }}</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view v-if="recentSearches.length" class="section-card">
      <view class="section-head">
        <text class="section-title">最近搜索</text>
        <text class="section-action" @tap="clearSearches">清空</text>
      </view>
      <view class="search-tags">
        <view v-for="item in recentSearches.slice(0, 8)" :key="item.keyword" class="search-tag" @tap="searchAgain(item.keyword)">{{ item.keyword }}</view>
      </view>
    </view>

    <view class="menu-card">
      <view v-for="item in menus" :key="item.label" class="menu-item" @tap="openMenu(item.path)">
        <view class="menu-left">
          <text class="menu-icon">{{ item.icon }}</text>
          <text class="menu-label">{{ item.label }}</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="review-note">
      当前版本为免费体验，不提供会员购买、订单、充值、提现或支付交易服务。
    </view>

    <view v-if="auth.isLoggedIn" class="logout-btn" @tap="handleLogout">退出登录</view>

    <AppBottomTab active="mine" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppBottomTab from '@/components/home/AppBottomTab.vue'
import { loginWithWechatProfile } from '@/api/auth'
import { getFavorites } from '@/api/favorites'
import { getMyLikedSongs } from '@/api/social'
import { getMySongs } from '@/api/songs'
import { useAuthStore } from '@/stores/auth'
import { FEATURES } from '@/config/features'
import { clearRecentImports, clearRecentSearches, getRecentImports, getRecentSearches, type RecentImportItem, type RecentSearchItem } from '@/utils/recent'

const auth = useAuthStore()
const stats = reactive({ works: 0, favorites: 0, liked: 0 })
const recentImports = ref<RecentImportItem[]>([])
const recentSearches = ref<RecentSearchItem[]>([])

const avatarText = computed(() => (auth.user?.nickname || '谱').slice(0, 1))

const menus = computed(() => [
  { icon: '♪', label: '我的作品', path: '/pages/record/index?type=create', show: true },
  { icon: '♡', label: '我的收藏', path: '/pages/favorites/index', show: true },
  { icon: '▶', label: '练习记录', path: '/pages/record/index?type=practice', show: true },
  { icon: '♬', label: '调音器', path: '/pages/community/index', show: FEATURES.ENABLE_TUNER },
  { icon: '◎', label: 'AI权益说明', path: '/pages/membership/index', show: true },
  { icon: '✉', label: '消息通知', path: '/pages/notifications/index', show: FEATURES.ENABLE_NOTIFICATIONS },
].filter(item => item.show))

onShow(() => {
  auth.restore()
  loadRecent()
  if (auth.isLoggedIn) loadStats()
})

function loadRecent() {
  recentImports.value = getRecentImports()
  recentSearches.value = getRecentSearches()
}

async function handleLogin() {
  await loginWithWechatProfile({ nickname: '谱灵用户' })
  await loadStats()
  uni.showToast({ title: '登录成功', icon: 'success' })
}

async function refreshUser() {
  await loginWithWechatProfile({
    nickname: auth.user?.nickname || '谱灵用户',
    avatar_url: auth.user?.avatar_url || '',
  })
  await loadStats()
  loadRecent()
  uni.showToast({ title: '已同步', icon: 'success' })
}

async function loadStats() {
  try {
    const [works, favorites, liked] = await Promise.all([
      getMySongs(1, 1),
      getFavorites(1, 1),
      getMyLikedSongs(1, 1),
    ])
    stats.works = works.total || 0
    stats.favorites = favorites.total || 0
    stats.liked = liked.total || 0
  } catch (error) {
    console.log('mine stats load failed', error)
  }
}

function clearImports() {
  clearRecentImports()
  recentImports.value = []
  uni.showToast({ title: '已清空', icon: 'none' })
}

function clearSearches() {
  clearRecentSearches()
  recentSearches.value = []
  uni.showToast({ title: '已清空', icon: 'none' })
}

function searchAgain(keyword: string) {
  uni.reLaunch({ url: `/pages/chat/index?keyword=${encodeURIComponent(keyword)}` })
}

function openSong(songId: string) {
  uni.navigateTo({ url: `/pages/song-detail/index?id=${songId}` })
}

function handleLogout() {
  auth.logout()
  stats.works = 0
  stats.favorites = 0
  stats.liked = 0
  uni.showToast({ title: '已退出', icon: 'none' })
}

function openMenu(path: string) {
  if (path === '/pages/community/index') {
    goMain(path)
    return
  }
  if (!auth.isLoggedIn && !path.includes('membership')) {
    handleLogin()
    return
  }
  uni.navigateTo({ url: path })
}

function goMain(url: string) {
  uni.reLaunch({ url })
}

function handleTabChange(value: string) {
  if (value === 'mine') return
  if (value === 'chat') goMain('/pages/chat/index')
  if (value === 'tuner') goMain('/pages/community/index')
}
</script>

<style scoped>
.page { width: 750rpx; min-height: 100vh; background: #F6FBF8; padding: calc(env(safe-area-inset-top) + 112rpx) 32rpx 144rpx; box-sizing: border-box; }
.profile-card { width: 686rpx; padding: 28rpx 24rpx; box-sizing: border-box; border-radius: 32rpx; background: linear-gradient(135deg, #EAF8F0 0%, #FFFFFF 100%); border: 1rpx solid #E8EFEA; display: flex; align-items: center; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 32rpx; background: #0BA45A; color: #FFFFFF; font-size: 36rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 22rpx; }
.profile-main { flex: 1; display: flex; flex-direction: column; }
.nickname { font-size: 36rpx; font-weight: 800; color: #17231E; }
.desc { margin-top: 8rpx; font-size: 24rpx; color: #6B756F; }
.edit-btn { height: 56rpx; padding: 0 24rpx; border-radius: 999rpx; background: #FFFFFF; border: 1rpx solid #E1EAE5; color: #0BA45A; font-size: 24rpx; font-weight: 700; display: flex; align-items: center; }
.quick-card { width: 686rpx; margin-top: 24rpx; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.quick-item { height: 150rpx; border-radius: 26rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 8rpx 22rpx rgba(18, 52, 36, 0.04); }
.quick-icon { color: #0BA45A; font-size: 34rpx; font-weight: 900; }
.quick-title { margin-top: 8rpx; color: #17231E; font-size: 26rpx; font-weight: 900; }
.quick-desc { margin-top: 5rpx; color: #7B8580; font-size: 19rpx; }
.quota-card { width: 686rpx; margin-top: 24rpx; padding: 24rpx; box-sizing: border-box; border-radius: 24rpx; background: #0BA45A; display: flex; align-items: center; justify-content: space-between; }
.quota-title { display: block; font-size: 30rpx; font-weight: 800; color: #FFFFFF; }
.quota-desc { display: block; margin-top: 8rpx; font-size: 24rpx; color: rgba(255,255,255,.78); }
.quota-action { height: 56rpx; padding: 0 28rpx; border-radius: 999rpx; background: #FFFFFF; color: #0BA45A; font-size: 24rpx; font-weight: 800; display: flex; align-items: center; }
.stats-row { width: 686rpx; margin-top: 24rpx; display: flex; gap: 16rpx; }
.stat-item { flex: 1; height: 128rpx; border-radius: 24rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.stat-num { font-size: 34rpx; font-weight: 800; color: #17231E; }
.stat-label { margin-top: 6rpx; font-size: 23rpx; color: #6B756F; }
.section-card, .menu-card { width: 686rpx; margin-top: 24rpx; border-radius: 24rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; box-sizing: border-box; overflow: hidden; }
.section-card { padding: 24rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.section-title { color: #17231E; font-size: 30rpx; font-weight: 900; }
.section-action { color: #0BA45A; font-size: 23rpx; font-weight: 800; }
.recent-item { min-height: 92rpx; display: flex; align-items: center; border-top: 1rpx solid #F0F4F1; }
.recent-icon { width: 52rpx; height: 52rpx; margin-right: 16rpx; border-radius: 16rpx; background: #EAF8F0; color: #0BA45A; font-size: 22rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.recent-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.recent-title { color: #17231E; font-size: 25rpx; font-weight: 900; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.recent-desc { margin-top: 4rpx; color: #7B8580; font-size: 21rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.search-tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.search-tag { height: 52rpx; padding: 0 20rpx; border-radius: 999rpx; background: #F6FAF8; color: #17231E; font-size: 23rpx; font-weight: 800; display: flex; align-items: center; }
.menu-card { padding: 8rpx 0; }
.menu-item { height: 92rpx; padding: 0 24rpx; display: flex; align-items: center; justify-content: space-between; }
.menu-left { display: flex; align-items: center; }
.menu-icon { width: 48rpx; font-size: 28rpx; color: #0BA45A; font-weight: 800; }
.menu-label { font-size: 28rpx; color: #17231E; font-weight: 600; }
.menu-arrow { font-size: 38rpx; color: #A4AEA8; }
.review-note { width: 686rpx; margin-top: 24rpx; padding: 20rpx 24rpx; box-sizing: border-box; border-radius: 20rpx; background: #FFF8E8; color: #9A6714; font-size: 23rpx; line-height: 36rpx; }
.logout-btn { width: 686rpx; height: 88rpx; margin-top: 24rpx; border-radius: 999rpx; color: #E5484D; background: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 700; }
</style>