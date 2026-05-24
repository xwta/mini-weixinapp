<template>
  <view class="detail-page">
    <view class="top-safe">
      <view class="back-btn" @tap="goBack">‹</view>
    </view>

    <scroll-view v-if="song" class="page-scroll" scroll-y>
      <view class="content-wrap">
        <view class="song-info-card card">
          <view class="title-row">
            <view class="title-main">
              <view class="song-title">{{ displayTitle }}</view>
              <view class="song-subtitle">{{ sourceLabel }} · {{ song.style || '民谣' }} · {{ song.difficulty || '新手友好' }}</view>
            </view>
          </view>

          <view class="author-row">
            <view class="author-avatar">▣</view>
            <view class="author-info" @tap="goUserProfile">
              <view class="author-name">{{ song.source_type === 'ai' ? '谱灵AI' : (song.artist_name || '谱灵用户') }}</view>
              <view class="author-desc">{{ song.source_type === 'ai' ? '刚刚生成' : '用户发布' }}</view>
            </view>
            <view class="favorite-btn" @tap.stop="handleFavorite">
              <text class="heart">♡</text>
              <text>收藏</text>
            </view>
          </view>

          <view class="param-grid">
            <view class="param-item">
              <view class="param-label">调式</view>
              <view class="param-value">{{ song.song_key || 'C' }}</view>
            </view>
            <view class="param-item">
              <view class="param-label">BPM</view>
              <view class="param-value">{{ song.bpm || 86 }}</view>
            </view>
            <view class="param-item">
              <view class="param-label">变调夹</view>
              <view class="param-value">{{ song.capo || '0品' }}</view>
            </view>
            <view class="param-item">
              <view class="param-label">难度</view>
              <view class="param-value">{{ song.difficulty || '新手' }}</view>
            </view>
          </view>
        </view>

        <view class="tool-card card">
          <view class="tool-btn" @tap="transposeUp">
            <text class="tool-icon">↑</text>
            <text>升调</text>
          </view>
          <view class="tool-btn" @tap="transposeDown">
            <text class="tool-icon">↓</text>
            <text>降调</text>
          </view>
          <view class="tool-btn active" @tap="startPractice">
            <text class="tool-icon">▤</text>
            <text>滚谱</text>
          </view>
          <view class="tool-btn" @tap="openMetronome">
            <text class="tool-icon">△</text>
            <text>节拍器</text>
          </view>
        </view>

        <view class="sheet-card card">
          <view v-for="section in sections" :key="section.name" class="sheet-section">
            <view class="section-title-row">
              <view class="section-mark" />
              <view class="section-name">{{ section.name }}</view>
            </view>

            <view v-for="(line, index) in section.lines" :key="index" class="sheet-line">
              <view v-if="line.chordLine" class="chord-line">{{ line.chordLine }}</view>
              <view class="lyric-line">{{ line.lyricLine }}</view>
            </view>
          </view>
        </view>

        <view v-if="practiceTips.length" class="practice-card">
          <view class="tips-head">
            <view class="tips-icon">♬</view>
            <view class="tips-title">练习建议</view>
          </view>
          <view class="tips-list">
            <view v-for="tip in practiceTips" :key="tip" class="tip-item">
              <view class="tip-dot" />
              <view class="tip-text">{{ tip }}</view>
            </view>
          </view>
        </view>

        <view class="comments-card card">
          <view class="comments-head">
            <view class="comments-title">评论</view>
            <view class="comments-count">{{ comments.length }}</view>
          </view>
          <view class="comment-input-row">
            <input v-model="commentText" class="comment-input" placeholder="说点关于这首谱的感受" />
            <view class="comment-send" @tap="submitComment">发送</view>
          </view>
          <view v-if="comments.length" class="comment-list">
            <view v-for="item in comments" :key="item.id" class="comment-item">
              <view class="comment-avatar">谱</view>
              <view class="comment-main">
                <view class="comment-content">{{ item.content }}</view>
                <view class="comment-meta">{{ item.like_count || 0 }} 赞</view>
              </view>
            </view>
          </view>
          <view v-else class="empty-comments">还没有评论，来当第一个拨片。</view>
        </view>
      </view>
    </scroll-view>

    <EmptyState v-else icon="♪" title="曲谱加载中" desc="正在把谱子从琴盒里拿出来" />

    <view v-if="song" class="bottom-action-bar">
      <view class="share-btn" @tap="shareSong">
        <text class="share-icon">□</text>
        <text>分享</text>
      </view>
      <view class="practice-btn" @tap="startPractice">
        <text class="play-icon">▶</text>
        <text>开始练习</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import EmptyState from '../../components/EmptyState.vue'
import { getSongDetail } from '../../api/songs'
import { addFavorite } from '../../api/favorites'
import { loginWithWechatProfile } from '../../api/auth'
import { followUser, likeSong } from '../../api/social'
import { createComment, getSongComments, type CommentItem } from '../../api/comments'
import { useAuthStore } from '../../stores/auth'
import type { Song, SongSection } from '../../types'

const song = ref<Song | null>(null)
const comments = ref<CommentItem[]>([])
const commentText = ref('')

const displayTitle = computed(() => {
  const title = song.value?.title || '夏夜晚风'
  return title.startsWith('《') ? title : `《${title}》`
})

const sourceLabel = computed(() => song.value?.source_type === 'ai' ? 'AI原创' : '用户作品')

const sections = computed<SongSection[]>(() => {
  const content = song.value?.content_json
  if (content?.sections?.length) return content.sections
  return [
    {
      name: '主歌',
      lines: [
        { chordLine: 'C                         G', lyricLine: '夏夜的风吹过操场' },
        { chordLine: 'Am                        F', lyricLine: '你轻轻哼着那段旧时光' },
      ],
    },
    {
      name: '副歌',
      lines: [
        { chordLine: 'G                         C', lyricLine: '我们把梦唱到天亮' },
      ],
    },
  ]
})

const practiceTips = computed<string[]>(() => {
  const tips = song.value?.content_json?.practiceTips
  if (tips?.length) return tips
  return ['先用 80 BPM 慢速练习主歌', '副歌注意 G 到 C 的换和弦', '适合新手扫弦节奏']
})

onLoad(async (query) => {
  const id = String(query?.id || '')
  if (id) {
    song.value = await getSongDetail(id)
    comments.value = await getSongComments(id)
  }
})

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

async function handleFavorite() {
  if (!song.value) return
  await ensureLogin()
  await addFavorite(song.value.id)
  song.value.favorite_count = Number(song.value.favorite_count || 0) + 1
  uni.showToast({ title: '已收藏', icon: 'success' })
}

async function handleLike() {
  if (!song.value) return
  await ensureLogin()
  const res = await likeSong(song.value.id)
  song.value.like_count = res.like_count
  uni.showToast({ title: '已点赞', icon: 'success' })
}

async function handleFollow() {
  if (!song.value?.user_id) return
  await ensureLogin()
  await followUser(song.value.user_id)
  uni.showToast({ title: '已关注作者', icon: 'success' })
}

async function submitComment() {
  if (!song.value || !commentText.value.trim()) return
  await ensureLogin()
  const comment = await createComment(song.value.id, commentText.value.trim())
  comments.value.unshift(comment)
  commentText.value = ''
  uni.showToast({ title: '评论成功', icon: 'success' })
}

function goBack() {
  uni.navigateBack()
}

function goUserProfile() {
  if (song.value?.user_id) uni.navigateTo({ url: `/pages/user-profile/index?id=${song.value.user_id}` })
}

function shareSong() {
  uni.showToast({ title: '分享海报功能开发中', icon: 'none' })
}

function startPractice() {
  if (song.value) uni.navigateTo({ url: `/pages/practice/index?id=${song.value.id}` })
}

function transposeUp() {
  uni.showToast({ title: '升调功能开发中', icon: 'none' })
}

function transposeDown() {
  uni.showToast({ title: '降调功能开发中', icon: 'none' })
}

function openMetronome() {
  uni.showToast({ title: '节拍器开发中', icon: 'none' })
}
</script>

<style scoped lang="scss">
.detail-page {
  width: 750rpx;
  min-height: 100vh;
  background: #F7FAF8;
  color: #17231E;
  box-sizing: border-box;
}

.top-safe {
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 0;
  box-sizing: border-box;
}

.back-btn {
  width: 88rpx;
  height: 88rpx;
  color: #17231E;
  font-size: 72rpx;
  line-height: 76rpx;
  font-weight: 300;
}

.page-scroll {
  height: calc(100vh - 112rpx);
}

.content-wrap {
  padding: 42rpx 32rpx 190rpx;
  box-sizing: border-box;
}

.card {
  width: 686rpx;
  box-sizing: border-box;
  background: #FFFFFF;
  border: 1rpx solid rgba(232, 239, 234, 0.9);
  box-shadow: 0 16rpx 42rpx rgba(18, 52, 36, 0.06);
}

.song-info-card {
  padding: 38rpx 32rpx 28rpx;
  border-radius: 36rpx;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.title-main {
  flex: 1;
  min-width: 0;
}

.song-title {
  color: #17231E;
  font-size: 43rpx;
  line-height: 56rpx;
  font-weight: 900;
  letter-spacing: -1rpx;
}

.song-subtitle {
  margin-top: 18rpx;
  color: #6B756F;
  font-size: 25rpx;
  line-height: 34rpx;
  font-weight: 500;
}

.author-row {
  margin-top: 34rpx;
  display: flex;
  align-items: center;
}

.author-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #10B15A;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 900;
  margin-right: 16rpx;
  box-shadow: 0 10rpx 24rpx rgba(16, 177, 90, 0.22);
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  color: #17231E;
  font-size: 27rpx;
  line-height: 34rpx;
  font-weight: 800;
}

.author-desc {
  margin-top: 4rpx;
  color: #8A9490;
  font-size: 23rpx;
  line-height: 30rpx;
}

.favorite-btn {
  height: 70rpx;
  min-width: 136rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  border: 1rpx solid #DCEFE6;
  color: #10B15A;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 26rpx;
  line-height: 34rpx;
  font-weight: 800;
}

.heart {
  font-size: 35rpx;
  line-height: 35rpx;
}

.param-grid {
  margin-top: 34rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18rpx;
}

.param-item {
  height: 112rpx;
  border-radius: 22rpx;
  background: #F6FAF8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.param-label {
  color: #6B756F;
  font-size: 24rpx;
  line-height: 30rpx;
}

.param-value {
  margin-top: 12rpx;
  color: #0C7A42;
  font-size: 34rpx;
  line-height: 40rpx;
  font-weight: 900;
}

.tool-card {
  margin-top: 30rpx;
  height: 114rpx;
  padding: 18rpx 20rpx;
  border-radius: 28rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18rpx;
}

.tool-btn {
  height: 76rpx;
  border-radius: 18rpx;
  border: 1rpx solid #E3EBE7;
  background: #FFFFFF;
  color: #17231E;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 25rpx;
  font-weight: 800;
}

.tool-btn.active {
  color: #0C9D50;
  background: #EAF8F0;
  border-color: #D8F0E4;
}

.tool-icon {
  color: #10B15A;
  font-size: 36rpx;
  line-height: 36rpx;
  font-weight: 900;
}

.sheet-card {
  margin-top: 30rpx;
  padding: 36rpx 32rpx;
  border-radius: 30rpx;
}

.sheet-section + .sheet-section {
  margin-top: 46rpx;
  padding-top: 44rpx;
  border-top: 1rpx dashed #D9E2DD;
}

.section-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.section-mark {
  width: 8rpx;
  height: 34rpx;
  border-radius: 999rpx;
  background: #10B15A;
  margin-right: 16rpx;
}

.section-name {
  color: #17231E;
  font-size: 32rpx;
  line-height: 40rpx;
  font-weight: 900;
}

.sheet-line + .sheet-line {
  margin-top: 34rpx;
}

.chord-line {
  color: #10B15A;
  font-size: 32rpx;
  line-height: 40rpx;
  font-weight: 900;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
}

.lyric-line {
  margin-top: 12rpx;
  color: #17231E;
  font-size: 32rpx;
  line-height: 48rpx;
  font-weight: 500;
}

.practice-card {
  width: 686rpx;
  margin-top: 30rpx;
  padding: 32rpx 34rpx;
  box-sizing: border-box;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #EAF8F0 0%, #F3FCF7 100%);
  border: 1rpx solid #CDEEDC;
}

.tips-head {
  display: flex;
  align-items: center;
}

.tips-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #10B15A;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 900;
  margin-right: 18rpx;
}

.tips-title {
  color: #17231E;
  font-size: 32rpx;
  line-height: 42rpx;
  font-weight: 900;
}

.tips-list {
  margin-top: 24rpx;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  margin-top: 14rpx;
}

.tip-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #10B15A;
  margin-top: 16rpx;
  flex-shrink: 0;
}

.tip-text {
  color: #17231E;
  font-size: 27rpx;
  line-height: 42rpx;
}

.comments-card {
  margin-top: 30rpx;
  padding: 32rpx;
  border-radius: 30rpx;
}

.comments-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comments-title {
  color: #17231E;
  font-size: 31rpx;
  line-height: 40rpx;
  font-weight: 900;
}

.comments-count {
  color: #8A9490;
  font-size: 24rpx;
}

.comment-input-row {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.comment-input {
  flex: 1;
  height: 72rpx;
  border-radius: 999rpx;
  background: #F6FAF8;
  padding: 0 24rpx;
  box-sizing: border-box;
  color: #17231E;
  font-size: 25rpx;
}

.comment-send {
  width: 108rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: #10B15A;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  font-weight: 900;
}

.comment-list {
  margin-top: 22rpx;
}

.comment-item {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #EDF3EF;
}

.comment-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #EAF8F0;
  color: #10B15A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 900;
  flex-shrink: 0;
}

.comment-main {
  flex: 1;
}

.comment-content {
  color: #17231E;
  font-size: 26rpx;
  line-height: 38rpx;
}

.comment-meta {
  margin-top: 8rpx;
  color: #8A9490;
  font-size: 22rpx;
}

.empty-comments {
  margin-top: 24rpx;
  color: #8A9490;
  font-size: 24rpx;
}

.bottom-action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 750rpx;
  min-height: 142rpx;
  padding: 22rpx 32rpx calc(env(safe-area-inset-bottom) + 16rpx);
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.94);
  border-top: 1rpx solid #E8EFEA;
  display: grid;
  grid-template-columns: 1fr 1.55fr;
  gap: 28rpx;
  z-index: 20;
}

.share-btn,
.practice-btn {
  height: 88rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  font-size: 30rpx;
  line-height: 38rpx;
  font-weight: 900;
}

.share-btn {
  background: #FFFFFF;
  color: #10B15A;
  border: 2rpx solid #10B15A;
}

.practice-btn {
  background: #10B15A;
  color: #FFFFFF;
  box-shadow: 0 14rpx 32rpx rgba(16, 177, 90, 0.22);
}

.share-icon,
.play-icon {
  font-size: 34rpx;
  font-weight: 900;
}
</style>
