<template>
  <view class="page">
    <AppNavbar title="我的记录" @back="goBack" />

    <view class="search-section">
      <AppSearchBar v-model="keyword" placeholder="搜索对话、创作、曲谱记录" />
    </view>

    <view class="tabs-section">
      <AppTabs v-model="activeType" :items="tabs" />
    </view>

    <view class="record-list">
      <view
        v-for="item in records"
        :key="item.id"
        class="record-card"
        @tap="openRecord(item.id)"
      >
        <view class="record-top">
          <view class="record-icon">{{ item.icon }}</view>
          <view class="record-main">
            <text class="record-title">{{ item.title }}</text>
            <text class="record-desc">{{ item.desc }}</text>
          </view>
          <text class="record-time">{{ item.time }}</text>
        </view>
        <view class="record-actions">
          <text class="record-action">继续对话</text>
          <text class="record-action">重新生成</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppNavbar from '@/components/base/AppNavbar.vue'
import AppSearchBar from '@/components/base/AppSearchBar.vue'
import AppTabs from '@/components/base/AppTabs.vue'

const keyword = ref('')
const activeType = ref('all')

const tabs = [
  { label: '全部', value: 'all' },
  { label: '对话', value: 'chat' },
  { label: '创作', value: 'create' },
  { label: '搜谱', value: 'search' },
  { label: '练习', value: 'practice' },
]

const records = [
  {
    id: '1',
    icon: '♪',
    title: '毕业民谣创作',
    desc: 'C · G · Am · F，新手弹唱版',
    time: '今天',
  },
  {
    id: '2',
    icon: '⌕',
    title: '晴天 吉他谱搜索',
    desc: '查看了 3 个弹唱版本',
    time: '昨天',
  },
  {
    id: '3',
    icon: '▶',
    title: 'C 和弦转换练习',
    desc: '节拍器 80 BPM，练习 12 分钟',
    time: '周二',
  },
]

function goBack() {
  uni.navigateBack()
}

function openRecord(id: string) {
  console.log('open record', id)
}
</script>

<style scoped>
.page {
  width: 750rpx;
  min-height: 100vh;
  background: #F6FBF8;
  box-sizing: border-box;
  padding-bottom: 48rpx;
}

.search-section {
  margin-top: 8rpx;
}

.tabs-section {
  margin-top: 24rpx;
}

.record-list {
  margin-top: 32rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.record-card {
  width: 686rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-shadow: 0 8rpx 28rpx rgba(18,52,36,.06);
}

.record-top {
  display: flex;
  align-items: flex-start;
}

.record-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  background: #EAF8F0;
  color: #0BA45A;
  font-size: 32rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.record-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.record-title {
  font-size: 30rpx;
  line-height: 40rpx;
  font-weight: 700;
  color: #17231E;
}

.record-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #6B756F;
}

.record-time {
  font-size: 22rpx;
  color: #A4AEA8;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.record-actions {
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #EDF3EF;
  display: flex;
  gap: 16rpx;
}

.record-action {
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #F0FBF5;
  color: #0BA45A;
  font-size: 23rpx;
  font-weight: 600;
}
</style>
