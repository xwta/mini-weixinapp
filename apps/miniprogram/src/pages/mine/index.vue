<template>
  <view class="page">
    <view class="profile-card">
      <view class="avatar">谱</view>
      <view class="profile-main">
        <text class="nickname">谱灵用户</text>
        <text class="desc">AI 吉他创作者</text>
      </view>
      <view class="edit-btn">编辑</view>
    </view>

    <view class="quota-card">
      <view>
        <text class="quota-title">AI 额度</text>
        <text class="quota-desc">今日还可生成 5 次</text>
      </view>
      <view class="quota-action">升级</view>
    </view>

    <view class="stats-row">
      <view class="stat-item">
        <text class="stat-num">12</text>
        <text class="stat-label">作品</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">36</text>
        <text class="stat-label">收藏</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">128</text>
        <text class="stat-label">获赞</text>
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

    <AppBottomTab active="mine" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import AppBottomTab from '@/components/home/AppBottomTab.vue'

const menus = [
  { icon: '♪', label: '我的作品', path: '/pages/mine/works' },
  { icon: '♡', label: '我的收藏', path: '/pages/mine/favorites' },
  { icon: '◎', label: '我的发布', path: '/pages/mine/posts' },
  { icon: '▶', label: '练习记录', path: '/pages/mine/practice' },
  { icon: '✉', label: '消息通知', path: '/pages/notifications/index' },
  { icon: '⚙', label: '设置中心', path: '/pages/settings/index' },
]

function openMenu(path: string) {
  uni.navigateTo({ url: path })
}

function handleTabChange(value: string) {
  if (value === 'mine') return
  if (value === 'chat') uni.switchTab({ url: '/pages/chat/index' })
  if (value === 'community') uni.switchTab({ url: '/pages/community/index' })
}
</script>

<style scoped>
.page {
  width: 750rpx;
  min-height: 100vh;
  background: #F6FBF8;
  padding: 32rpx 32rpx 144rpx;
  box-sizing: border-box;
}

.profile-card {
  width: 686rpx;
  padding: 28rpx 24rpx;
  box-sizing: border-box;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #EAF8F0 0%, #FFFFFF 100%);
  border: 1rpx solid #E8EFEA;
  display: flex;
  align-items: center;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 32rpx;
  background: #0BA45A;
  color: #FFFFFF;
  font-size: 36rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 22rpx;
}

.profile-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.nickname {
  font-size: 36rpx;
  font-weight: 800;
  color: #17231E;
}

.desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6B756F;
}

.edit-btn {
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid #E1EAE5;
  color: #0BA45A;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.quota-card {
  width: 686rpx;
  margin-top: 24rpx;
  padding: 24rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #0BA45A;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quota-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #FFFFFF;
}

.quota-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: rgba(255,255,255,.78);
}

.quota-action {
  height: 56rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  color: #0BA45A;
  font-size: 24rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
}

.stats-row {
  width: 686rpx;
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.stat-item {
  flex: 1;
  height: 128rpx;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stat-num {
  font-size: 34rpx;
  font-weight: 800;
  color: #17231E;
}

.stat-label {
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #6B756F;
}

.menu-card {
  width: 686rpx;
  margin-top: 24rpx;
  padding: 8rpx 0;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-sizing: border-box;
}

.menu-item {
  height: 92rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menu-left {
  display: flex;
  align-items: center;
}

.menu-icon {
  width: 48rpx;
  font-size: 28rpx;
  color: #0BA45A;
  font-weight: 800;
}

.menu-label {
  font-size: 28rpx;
  color: #17231E;
  font-weight: 600;
}

.menu-arrow {
  font-size: 38rpx;
  color: #A4AEA8;
}
</style>
