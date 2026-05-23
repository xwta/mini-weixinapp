<template>
  <view class="profile-page">
    <AppNavBar title="我的" subtitle="管理作品、收藏和创作次数" />

    <view class="container">
      <view class="user-card card">
        <view class="avatar">{{ avatarText }}</view>
        <view class="user-main">
          <view class="nickname">{{ auth.user?.nickname || '谱灵用户' }}</view>
          <view class="quota">{{ auth.isLoggedIn ? `剩余 ${auth.user?.generation_quota ?? 0} 次生成` : '登录后同步作品与收藏' }}</view>
        </view>
        <view v-if="!auth.isLoggedIn" class="login-btn" @tap="handleLogin">登录</view>
        <view v-else class="vip-tag">{{ auth.user?.membership_type === 'free' ? '免费' : '会员' }}</view>
      </view>

      <view class="stats-grid">
        <view class="stat card">
          <view class="stat-num">{{ auth.user?.total_generated || 0 }}</view>
          <view class="stat-label">累计生成</view>
        </view>
        <view class="stat card">
          <view class="stat-num">{{ auth.user?.generation_quota || 0 }}</view>
          <view class="stat-label">剩余次数</view>
        </view>
      </view>

      <view class="menu-card card">
        <view class="menu-title">我的内容</view>
        <view class="menu-item" @tap="goMySongs">
          <text>我的作品</text>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @tap="goFavorites">
          <text>我的收藏</text>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @tap="showDeveloping">
          <text>最近练习</text>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="vip-card" @tap="goMembership">
        <view class="vip-title">谱灵 AI 会员</view>
        <view class="vip-desc">高级改编、导出图片、更多生成次数</view>
        <view class="vip-btn">立即开通</view>
      </view>

      <view v-if="auth.isLoggedIn" class="logout" @tap="handleLogout">退出登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavBar from '../../components/AppNavBar.vue'
import { loginWithWechatProfile } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const avatarText = computed(() => (auth.user?.nickname || '谱').slice(0, 1))

onShow(async () => {
  if (!auth.isLoggedIn) return
  try {
    await loginWithWechatProfile({
      nickname: auth.user?.nickname || '谱灵用户',
      avatar_url: auth.user?.avatar_url || '',
    })
  } catch (_error) {
    // 静默失败，避免打断页面浏览
  }
})

async function handleLogin() {
  await loginWithWechatProfile({ nickname: '谱灵用户' })
  uni.showToast({ title: '登录成功', icon: 'success' })
}

function handleLogout() {
  auth.logout()
  uni.showToast({ title: '已退出', icon: 'none' })
}

function goMySongs() {
  uni.switchTab({ url: '/pages/songs/index' })
}

function goFavorites() {
  uni.navigateTo({ url: '/pages/favorites/index' })
}

function goMembership() {
  uni.navigateTo({ url: '/pages/membership/index' })
}

function showDeveloping() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<style scoped lang="scss">
.profile-page {
  min-height: 100vh;
  background: #fafaf6;
}

.user-card {
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 40rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  font-size: 48rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-main {
  flex: 1;
}

.nickname {
  color: #123c32;
  font-size: 36rpx;
  font-weight: 900;
}

.quota {
  margin-top: 12rpx;
  color: #687078;
  font-size: 24rpx;
}

.login-btn,
.vip-tag {
  height: 56rpx;
  padding: 0 26rpx;
  border-radius: 28rpx;
  background: #fff3cf;
  color: #8a5a24;
  font-size: 24rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
}

.stats-grid {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.stat {
  padding: 30rpx;
}

.stat-num {
  color: #123c32;
  font-size: 46rpx;
  font-weight: 900;
}

.stat-label {
  margin-top: 8rpx;
  color: #687078;
  font-size: 24rpx;
}

.menu-card {
  margin-top: 28rpx;
  padding: 30rpx;
}

.menu-title {
  color: #123c32;
  font-size: 32rpx;
  font-weight: 900;
  margin-bottom: 16rpx;
}

.menu-item {
  height: 92rpx;
  border-bottom: 1px solid #f1f2f3;
  color: #123c32;
  font-size: 30rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menu-item:last-child {
  border-bottom: none;
}

.arrow {
  color: #a0a7ae;
  font-size: 44rpx;
}

.vip-card {
  margin-top: 28rpx;
  padding: 36rpx;
  border-radius: 44rpx;
  background: #123c32;
  color: #fff;
  overflow: hidden;
}

.vip-title {
  color: #fff3cf;
  font-size: 38rpx;
  font-weight: 900;
}

.vip-desc {
  margin-top: 18rpx;
  color: #e8f7f0;
  font-size: 26rpx;
}

.vip-btn {
  margin-top: 28rpx;
  width: 180rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: #fff3cf;
  color: #123c32;
  font-size: 26rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout {
  margin-top: 34rpx;
  height: 84rpx;
  border-radius: 42rpx;
  color: #e5484d;
  font-size: 28rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
