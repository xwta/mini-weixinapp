<template>
  <view class="page">
    <view class="top-area">
      <view class="page-title-row">
        <text class="page-title">社区</text>
        <view class="publish-btn" @tap="goPublish">发布</view>
      </view>
      <AppSearchBar v-model="keyword" placeholder="搜索歌曲、用户、话题、和弦" @confirm="loadFeed" />
    </view>

    <view class="tabs-section">
      <AppTabs v-model="activeTab" :items="tabs" />
    </view>

    <view class="feed-list">
      <view v-for="item in posts" :key="item.id" class="post-card" @tap="openSong(item.id)">
        <view class="author-row">
          <view class="avatar">{{ item.avatar }}</view>
          <view class="author-info">
            <text class="author-name">{{ item.author }}</text>
            <text class="post-time">{{ item.time }}</text>
          </view>
          <view class="follow-btn" @tap.stop="followAuthor(item)">关注</view>
        </view>

        <text class="post-title">{{ item.title }}</text>
        <text class="post-desc">{{ item.desc }}</text>

        <view class="chord-preview">
          <text class="chord-text">{{ item.chords }}</text>
        </view>

        <view class="post-actions">
          <text class="action" @tap.stop="likePost(item)">♡ {{ item.likes }}</text>
          <text class="action">评论 {{ item.comments }}</text>
          <text class="action" @tap.stop="favoritePost(item)">收藏</text>
          <text class="action" @tap.stop="sharePost">分享</text>
        </view>
      </view>

      <view v-if="!posts.length && !loading" class="empty-card">
        <view class="empty-icon">♪</view>
        <view class="empty-title">还没有社区曲谱</view>
        <view class="empty-desc">去生成或发布第一首谱，让社区先响一声。</view>
      </view>
    </view>

    <AppBottomTab active="community" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppSearchBar from '@/components/base/AppSearchBar.vue'
import AppTabs from '@/components/base/AppTabs.vue'
import AppBottomTab from '@/components/home/AppBottomTab.vue'
import { getHomeDiscovery } from '@/api/discovery'
import { searchSongs } from '@/api/songs'
import { addFavorite } from '@/api/favorites'
import { followUser, likeSong } from '@/api/social'
import { loginWithWechatProfile } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import type { Song } from '@/types'

interface CommunityPost {
  id: string | number
  userId?: string | number
  avatar: string
  author: string
  time: string
  title: string
  desc: string
  chords: string
  likes: number
  comments: number
}

const keyword = ref('')
const activeTab = ref('recommend')
const posts = ref<CommunityPost[]>([])
const loading = ref(false)

const tabs = [
  { label: '推荐', value: 'recommend' },
  { label: '关注', value: 'follow' },
  { label: '最新', value: 'new' },
  { label: '热门', value: 'hot' },
]

watch(activeTab, loadFeed)
onShow(loadFeed)

function toPost(song: Song | any): CommunityPost {
  const title = song.title || '未命名曲谱'
  const author = song.artist_name || song.author_name || (song.source_type === 'ai' ? '谱灵AI作品' : '谱友作品')
  const chords = song.content_json?.chords?.length
    ? song.content_json.chords.join(' · ')
    : `${song.song_key || 'C'}调 · ${song.difficulty || '新手'}`

  return {
    id: song.id || song._id,
    userId: song.user_id,
    avatar: String(author).slice(0, 1) || '谱',
    author,
    time: '刚刚更新',
    title,
    desc: `${song.style || '弹唱'} · ${song.song_key || 'C'}调 · ${song.difficulty || '新手'}，适合直接打开练习。`,
    chords,
    likes: Number(song.like_count || song.likes || 0),
    comments: Number(song.comment_count || 0),
  }
}

async function loadFeed() {
  loading.value = true
  try {
    if (keyword.value.trim()) {
      const result = await searchSongs({ keyword: keyword.value.trim(), page_size: 30 })
      posts.value = result.items.map(toPost)
      return
    }

    if (activeTab.value === 'hot') {
      const result = await searchSongs({ sort: 'likes', page_size: 30 })
      posts.value = result.items.map(toPost)
      return
    }

    if (activeTab.value === 'new') {
      const result = await searchSongs({ sort: 'created_at' as any, page_size: 30 })
      posts.value = result.items.map(toPost)
      return
    }

    const home = await getHomeDiscovery()
    const source = activeTab.value === 'follow' ? home.recommend : [...home.hot, ...home.recommend]
    const dedup = new Map<string | number, any>()
    source.forEach((item: any) => dedup.set(item.id || item._id || item.title, item))
    posts.value = Array.from(dedup.values()).map(toPost)
  } catch (error) {
    console.log('community load failed', error)
    posts.value = []
  } finally {
    loading.value = false
  }
}

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

function openSong(id: string | number) {
  uni.navigateTo({ url: `/pages/song-detail/index?id=${id}` })
}

function goPublish() {
  uni.navigateTo({ url: '/pages/manual-create/index' })
}

async function likePost(item: CommunityPost) {
  await ensureLogin()
  const res = await likeSong(item.id)
  item.likes = res.like_count || item.likes + 1
  uni.showToast({ title: '已点赞', icon: 'success' })
}

async function favoritePost(item: CommunityPost) {
  await ensureLogin()
  await addFavorite(item.id)
  uni.showToast({ title: '已收藏', icon: 'success' })
}

async function followAuthor(item: CommunityPost) {
  if (!item.userId) {
    uni.showToast({ title: '作者信息不足', icon: 'none' })
    return
  }
  await ensureLogin()
  await followUser(item.userId)
  uni.showToast({ title: '已关注', icon: 'success' })
}

function sharePost() {
  uni.showToast({ title: '分享功能待接入', icon: 'none' })
}

function goMain(url: string) {
  uni.reLaunch({ url })
}

function handleTabChange(value: string) {
  if (value === 'community') return
  if (value === 'chat') goMain('/pages/chat/index')
  if (value === 'mine') goMain('/pages/mine/index')
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
  padding-top: calc(env(safe-area-inset-top) + 52rpx);
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
  animation: feedIn .22s ease-out;
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
  min-height: 72rpx;
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

.empty-card {
  width: 686rpx;
  padding: 72rpx 32rpx;
  box-sizing: border-box;
  border-radius: 28rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 32rpx;
  background: #EAF8F0;
  color: #0BA45A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  font-weight: 800;
}

.empty-title {
  margin-top: 24rpx;
  color: #17231E;
  font-size: 30rpx;
  font-weight: 800;
}

.empty-desc {
  margin-top: 10rpx;
  color: #6B756F;
  font-size: 24rpx;
  text-align: center;
}

@keyframes feedIn {
  from { opacity: 0; transform: translateY(16rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>