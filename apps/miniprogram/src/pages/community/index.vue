<template>
  <view class="page">
    <view class="top-area">
      <view class="page-title-row">
        <text class="page-title">社区</text>
        <view class="publish-btn" @tap="goPublish">发布</view>
      </view>
      <AppSearchBar v-model="keyword" placeholder="搜索歌曲、用户、话题、和弦" />
    </view>

    <view class="tabs-section">
      <AppTabs v-model="activeTab" :items="tabs" />
    </view>

    <view class="feed-list">
      <view v-for="item in posts" :key="item.id" class="post-card">
        <view class="author-row">
          <view class="avatar">{{ item.avatar }}</view>
          <view class="author-info">
            <text class="author-name">{{ item.author }}</text>
            <text class="post-time">{{ item.time }}</text>
          </view>
          <view class="follow-btn">关注</view>
        </view>

        <text class="post-title">{{ item.title }}</text>
        <text class="post-desc">{{ item.desc }}</text>

        <view class="chord-preview">
          <text class="chord-text">{{ item.chords }}</text>
        </view>

        <view class="post-actions">
          <text class="action">♡ {{ item.likes }}</text>
          <text class="action">评论 {{ item.comments }}</text>
          <text class="action">收藏</text>
          <text class="action">分享</text>
        </view>
      </view>
    </view>

    <AppBottomTab active="community" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppSearchBar from '@/components/base/AppSearchBar.vue'
import AppTabs from '@/components/base/AppTabs.vue'
import AppBottomTab from '@/components/home/AppBottomTab.vue'

const keyword = ref('')
const activeTab = ref('recommend')

const tabs = [
  { label: '推荐', value: 'recommend' },
  { label: '关注', value: 'follow' },
  { label: '最新', value: 'new' },
  { label: '热门', value: 'hot' },
]

const posts = [
  {
    id: '1',
    avatar: '木',
    author: '木吉他小北',
    time: '刚刚',
    title: '毕业季新手弹唱版',
    desc: '用 C G Am F 做了一版很适合女生声线的毕业民谣。',
    chords: 'C · G · Am · F',
    likes: 128,
    comments: 23,
  },
  {
    id: '2',
    avatar: '谱',
    author: '谱灵AI作品',
    time: '12分钟前',
    title: '雨天咖啡馆氛围歌',
    desc: '慢速 72BPM，适合指弹改编和低声弹唱。',
    chords: 'Am · F · C · G',
    likes: 86,
    comments: 11,
  },
]

function goPublish() {
  uni.navigateTo({ url: '/pages/community/publish' })
}

function handleTabChange(value: string) {
  if (value === 'community') return
  if (value === 'chat') uni.switchTab({ url: '/pages/chat/index' })
  if (value === 'mine') uni.switchTab({ url: '/pages/mine/index' })
}
</script>

<style scoped>
.page {
  width: 750rpx;
  min-height: 100vh;
  background: #F6FBF8;
  padding-bottom: 144rpx;
  box-sizing: border-box;
}

.top-area {
  padding-top: 24rpx;
}

.page-title-row {
  width: 750rpx;
  padding: 0 32rpx 24rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #17231E;
}

.publish-btn {
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #0BA45A;
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tabs-section {
  margin-top: 24rpx;
}

.feed-list {
  padding: 32rpx 32rpx 0;
  box-sizing: border-box;
}

.post-card {
  width: 686rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-shadow: 0 8rpx 28rpx rgba(18,52,36,.06);
}

.author-row {
  display: flex;
  align-items: center;
}

.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 22rpx;
  background: #EAF8F0;
  color: #0BA45A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 800;
  margin-right: 16rpx;
}

.author-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #17231E;
}

.post-time {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #A4AEA8;
}

.follow-btn {
  height: 52rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #F0FBF5;
  color: #0BA45A;
  font-size: 23rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.post-title {
  display: block;
  margin-top: 24rpx;
  font-size: 32rpx;
  line-height: 42rpx;
  font-weight: 800;
  color: #17231E;
}

.post-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 38rpx;
  color: #6B756F;
}

.chord-preview {
  margin-top: 20rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: #F6FBF8;
  display: flex;
  align-items: center;
  padding: 0 22rpx;
  box-sizing: border-box;
}

.chord-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #0BA45A;
}

.post-actions {
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #EDF3EF;
  display: flex;
  justify-content: space-between;
}

.action {
  font-size: 23rpx;
  color: #6B756F;
}
</style>
