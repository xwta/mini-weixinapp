<template>
  <view class="page">
    <view class="top-safe">
      <view class="header-row">
        <text class="page-title">我的记录</text>
        <view class="search-btn" @tap="toggleSearch">⌕</view>
      </view>

      <view v-if="showSearch" class="search-panel">
        <input
          v-model="keyword"
          class="search-input"
          confirm-type="search"
          placeholder="搜索创作、收藏、练习记录"
          @confirm="loadRecords"
        />
      </view>

      <scroll-view class="tabs-scroll" scroll-x :show-scrollbar="false">
        <view class="tabs-row">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            :class="['filter-tab', activeType === tab.value && 'active']"
            @tap="activeType = tab.value"
          >
            {{ tab.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="timeline-wrap">
      <view class="timeline-line" />

      <view v-for="section in timelineSections" :key="section.label" class="timeline-section">
        <view class="section-head">
          <view class="node node-large" />
          <text class="section-label">{{ section.label }}</text>
        </view>

        <view class="section-cards">
          <view
            v-for="item in section.items"
            :key="item.id"
            :class="['record-card', item.compact && 'compact-card']"
            @tap="openRecord(item)"
          >
            <view :class="['icon-box', item.tone]">{{ item.icon }}</view>

            <view class="card-main">
              <view v-if="item.tag" :class="['record-tag', item.tone]">{{ item.tag }}</view>
              <view class="card-title">{{ item.title }}</view>
              <view v-if="item.desc" class="card-desc">{{ item.desc }}</view>

              <view v-if="item.progress !== undefined" class="progress-card">
                <view class="progress-top">
                  <text>练习完成 {{ item.progress }}%</text>
                  <view class="progress-badge">▥</view>
                </view>
                <view class="progress-track">
                  <view class="progress-fill" :style="{ width: `${item.progress}%` }" />
                </view>
              </view>

              <view v-if="item.duration || item.bpm" class="stats-grid">
                <view class="stat-box">
                  <text class="stat-icon">◷</text>
                  <view>
                    <view class="stat-label">练习时长</view>
                    <view class="stat-value">{{ item.duration || 15 }} <text>分钟</text></view>
                  </view>
                </view>
                <view class="stat-box">
                  <text class="stat-icon">⌁</text>
                  <view>
                    <view class="stat-label">BPM</view>
                    <view class="stat-value">{{ item.bpm || 80 }}</view>
                  </view>
                </view>
              </view>
            </view>

            <view class="card-action" @tap.stop="openRecord(item)">
              <text>查看</text>
              <text v-if="item.compact" class="arrow">›</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="!timelineSections.length && !loading" class="empty-card">
        <view class="empty-icon">♪</view>
        <view class="empty-title">还没有音乐轨迹</view>
        <view class="empty-desc">去谱灵页创作、搜谱或练习，记录会在这里慢慢长成一棵歌单树。</view>
      </view>
    </view>

    <AppBottomTab active="mine" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppBottomTab from '@/components/home/AppBottomTab.vue'
import { loginWithWechatProfile } from '@/api/auth'
import { getFavorites } from '@/api/favorites'
import { getRecentPracticeRecords } from '@/api/practice'
import { getMyLikedSongs } from '@/api/social'
import { getMySongs } from '@/api/songs'
import { useAuthStore } from '@/stores/auth'
import type { Song } from '@/types'

type RecordType = 'all' | 'create' | 'favorite' | 'practice' | 'like'
type ToneType = 'green' | 'yellow' | 'red'

interface RecordItem {
  id: string
  type: Exclude<RecordType, 'all'>
  icon: string
  title: string
  desc?: string
  tag?: string
  tone: ToneType
  songId?: string | number
  progress?: number
  duration?: number
  bpm?: number
  compact?: boolean
}

interface TimelineSection {
  label: string
  items: RecordItem[]
}

const keyword = ref('')
const activeType = ref<RecordType>('all')
const showSearch = ref(false)
const records = ref<RecordItem[]>([])
const loading = ref(false)

const tabs: { label: string; value: RecordType }[] = [
  { label: '全部', value: 'all' },
  { label: '创作', value: 'create' },
  { label: '收藏', value: 'favorite' },
  { label: '练习', value: 'practice' },
  { label: '点赞', value: 'like' },
]

const filteredRecords = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return records.value.filter((item) => {
    const matchType = activeType.value === 'all' || item.type === activeType.value
    const matchKey = !key || `${item.title} ${item.desc || ''} ${item.tag || ''}`.toLowerCase().includes(key)
    return matchType && matchKey
  })
})

const timelineSections = computed<TimelineSection[]>(() => {
  const items = filteredRecords.value
  if (!items.length) return []

  const today = items.filter((item) => item.type === 'create').slice(0, 2)
  const yesterday = items.filter((item) => item.type === 'practice').slice(0, 2)
  const earlier = items.filter((item) => item.type === 'favorite' || item.type === 'like' || !today.includes(item) && !yesterday.includes(item))

  const sections = [
    { label: '今天', items: today },
    { label: '昨天', items: yesterday },
    { label: '更早', items: earlier },
  ].filter((section) => section.items.length)

  if (activeType.value !== 'all' && items.length && !sections.length) {
    return [{ label: '最近', items }]
  }

  return sections
})

onLoad((query) => {
  if (query?.type) {
    const type = String(query.type)
    activeType.value = type === 'search' ? 'favorite' : (type as RecordType)
  }
})

onShow(loadRecords)

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

function formatTitle(title?: string) {
  return title ? `《${title.replace(/^《|》$/g, '')}》` : '《未命名曲谱》'
}

function songDesc(song: Song | any) {
  return `${song.style || '民谣'} · ${song.song_key || 'C'}调 · ${song.source_type === 'ai' ? 'AI创作' : song.difficulty || '新手'}`
}

function workToRecord(song: Song | any, index: number): RecordItem {
  return {
    id: `create-${song.id || song._id || index}`,
    type: 'create',
    icon: '♪',
    title: formatTitle(song.title),
    desc: songDesc(song),
    tone: 'green',
    songId: song.id || song._id,
    progress: index === 0 ? 75 : undefined,
  }
}

function favoriteToRecord(song: Song | any, index: number): RecordItem {
  return {
    id: `favorite-${song.id || song._id || index}`,
    type: 'favorite',
    icon: '★',
    title: formatTitle(song.title),
    tag: '收藏',
    tone: 'yellow',
    songId: song.id || song._id,
    compact: true,
  }
}

function likedToRecord(song: Song | any, index: number): RecordItem {
  return {
    id: `like-${song.id || song._id || index}`,
    type: 'like',
    icon: '♥',
    title: formatTitle(song.title),
    tag: '点赞',
    tone: 'red',
    songId: song.id || song._id,
    compact: true,
  }
}

function practiceToRecord(item: any, index: number): RecordItem {
  const duration = Math.max(1, Math.round(Number(item.duration_seconds || 900) / 60))
  return {
    id: `practice-${item._id || item.id || item.song_id || index}`,
    type: 'practice',
    icon: '♬',
    title: formatTitle(item.song_title || item.title || '晴天'),
    desc: '练习记录',
    tone: 'green',
    songId: item.song_id,
    duration,
    bpm: Number(item.bpm || 80),
  }
}

async function loadRecords() {
  loading.value = true
  try {
    await ensureLogin()
    const [works, favorites, liked, practice] = await Promise.all([
      getMySongs(1, 30),
      getFavorites(1, 30),
      getMyLikedSongs(1, 30),
      getRecentPracticeRecords(1, 30),
    ])

    const workRecords = (works.items || []).map(workToRecord)
    const favoriteRecords = (favorites.items || []).map(favoriteToRecord)
    const likedRecords = (liked.items || []).map(likedToRecord)
    const practiceRecords = (practice?.items || []).map(practiceToRecord)

    records.value = [...workRecords, ...practiceRecords, ...favoriteRecords, ...likedRecords]
  } catch (error) {
    console.log('record load failed', error)
    records.value = []
  } finally {
    loading.value = false
  }
}

function toggleSearch() {
  showSearch.value = !showSearch.value
}

function openRecord(item: RecordItem) {
  if (item.songId) {
    uni.navigateTo({ url: `/pages/song-detail/index?id=${item.songId}` })
  }
}

function goMain(url: string) {
  uni.reLaunch({ url })
}

function handleTabChange(value: string) {
  if (value === 'mine') return
  if (value === 'chat') goMain('/pages/chat/index')
  if (value === 'community') goMain('/pages/community/index')
}
</script>

<style scoped>
.page {
  width: 750rpx;
  min-height: 100vh;
  background: #F7FAF8;
  box-sizing: border-box;
  padding-bottom: 148rpx;
  color: #17231E;
}

.top-safe {
  padding: calc(env(safe-area-inset-top) + 84rpx) 48rpx 0;
  box-sizing: border-box;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 48rpx;
  line-height: 64rpx;
  color: #17231E;
  font-weight: 900;
  letter-spacing: -1rpx;
}

.search-btn {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-shadow: 0 10rpx 28rpx rgba(18, 52, 36, 0.08);
  color: #17231E;
  font-size: 44rpx;
  line-height: 84rpx;
  text-align: center;
  font-weight: 700;
}

.search-panel {
  margin-top: 24rpx;
}

.search-input {
  height: 76rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  padding: 0 28rpx;
  box-sizing: border-box;
  color: #17231E;
  font-size: 26rpx;
}

.tabs-scroll {
  width: 654rpx;
  margin-top: 34rpx;
  white-space: nowrap;
}

.tabs-row {
  display: flex;
  gap: 24rpx;
  align-items: center;
}

.filter-tab {
  height: 68rpx;
  min-width: 116rpx;
  padding: 0 30rpx;
  box-sizing: border-box;
  border-radius: 999rpx;
  background: #F1F5F3;
  color: #17231E;
  font-size: 28rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-tab.active {
  background: #10B15A;
  color: #FFFFFF;
  box-shadow: 0 12rpx 28rpx rgba(16, 177, 90, 0.22);
}

.timeline-wrap {
  position: relative;
  margin-top: 52rpx;
  padding: 0 48rpx 32rpx;
  box-sizing: border-box;
}

.timeline-line {
  position: absolute;
  left: 60rpx;
  top: 20rpx;
  bottom: 72rpx;
  width: 2rpx;
  background: #D9E6DF;
}

.timeline-section {
  position: relative;
  margin-bottom: 42rpx;
}

.section-head {
  display: flex;
  align-items: center;
  height: 44rpx;
  margin-bottom: 22rpx;
}

.node {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  border-radius: 50%;
  background: #10B15A;
}

.node-large {
  width: 26rpx;
  height: 26rpx;
  margin-left: 0;
  box-shadow: 0 0 0 12rpx #E4F6EC;
}

.section-label {
  margin-left: 44rpx;
  color: #17231E;
  font-size: 32rpx;
  font-weight: 900;
}

.section-cards {
  padding-left: 48rpx;
  box-sizing: border-box;
}

.record-card {
  width: 606rpx;
  min-height: 178rpx;
  margin-bottom: 24rpx;
  padding: 32rpx;
  box-sizing: border-box;
  border-radius: 34rpx;
  background: #FFFFFF;
  border: 1rpx solid rgba(232, 239, 234, 0.9);
  box-shadow: 0 16rpx 42rpx rgba(18, 52, 36, 0.06);
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  animation: recordIn 0.2s ease-out;
}

.compact-card {
  min-height: 120rpx;
  align-items: center;
  padding: 28rpx 30rpx;
}

.icon-box {
  width: 78rpx;
  height: 78rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  font-weight: 900;
}

.icon-box.green {
  color: #10B15A;
  background: #EAF8F0;
}

.icon-box.yellow {
  color: #F2B92E;
  background: #FFF6DF;
}

.icon-box.red {
  color: #F05C6B;
  background: #FFECEF;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-title {
  color: #17231E;
  font-size: 31rpx;
  line-height: 42rpx;
  font-weight: 900;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card-desc {
  margin-top: 10rpx;
  color: #6B756F;
  font-size: 24rpx;
  line-height: 34rpx;
}

.record-tag {
  margin-bottom: 6rpx;
  font-size: 24rpx;
  line-height: 30rpx;
  font-weight: 900;
}

.record-tag.green {
  color: #10B15A;
}

.record-tag.yellow {
  color: #10B15A;
}

.record-tag.red {
  color: #F05C6B;
}

.card-action {
  min-width: 84rpx;
  height: 56rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #F0FBF5;
  color: #0C9D50;
  border: 1rpx solid #DCEFE6;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 24rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.arrow {
  color: #9BA6A1;
  font-size: 40rpx;
  line-height: 40rpx;
  font-weight: 400;
}

.progress-card {
  margin-top: 28rpx;
  padding: 22rpx 24rpx;
  border-radius: 24rpx;
  background: #F6FAF8;
}

.progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #10B15A;
  font-size: 25rpx;
  line-height: 34rpx;
  font-weight: 900;
}

.progress-badge {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #10B15A;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 900;
}

.progress-track {
  margin-top: 14rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #DDF0E6;
  overflow: hidden;
}

.progress-fill {
  height: 10rpx;
  border-radius: 999rpx;
  background: #10B15A;
}

.stats-grid {
  margin-top: 28rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.stat-box {
  height: 94rpx;
  border-radius: 22rpx;
  background: #F6FAF8;
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 0 22rpx;
  box-sizing: border-box;
}

.stat-icon {
  color: #10B15A;
  font-size: 32rpx;
  font-weight: 900;
}

.stat-label {
  color: #6B756F;
  font-size: 23rpx;
  line-height: 28rpx;
}

.stat-value {
  color: #17231E;
  font-size: 31rpx;
  line-height: 38rpx;
  font-weight: 900;
}

.stat-value text {
  font-size: 23rpx;
  font-weight: 500;
}

.empty-card {
  width: 606rpx;
  margin-left: 48rpx;
  padding: 72rpx 32rpx;
  border-radius: 34rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 30rpx;
  background: #EAF8F0;
  color: #10B15A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  font-weight: 900;
}

.empty-title {
  margin-top: 24rpx;
  color: #17231E;
  font-size: 30rpx;
  font-weight: 900;
}

.empty-desc {
  margin-top: 12rpx;
  color: #6B756F;
  font-size: 24rpx;
  line-height: 36rpx;
  text-align: center;
}

@keyframes recordIn {
  from {
    opacity: 0;
    transform: translateY(14rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
