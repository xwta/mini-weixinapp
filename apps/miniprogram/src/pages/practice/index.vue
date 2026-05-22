<template>
  <view class="practice-page">
    <AppNavBar title="练习模式" :subtitle="song?.title || '边看边弹，节奏别慌'" show-back />

    <view v-if="song" class="practice-container">
      <view class="control-card">
        <view class="song-title">{{ song.title }}</view>
        <view class="song-meta">{{ song.song_key || 'C' }}调 · {{ song.bpm || 86 }} BPM · {{ song.capo || '0品' }}</view>
        <view class="controls">
          <view class="control-btn primary" @tap="togglePlaying">{{ playing ? '暂停滚谱' : '开始滚谱' }}</view>
          <view class="control-btn" @tap="decreaseSpeed">慢一点</view>
          <view class="control-btn" @tap="increaseSpeed">快一点</view>
        </view>
        <view class="speed-text">滚动速度：{{ scrollSpeed }} · 字号：{{ fontSize }}rpx</view>
      </view>

      <scroll-view class="sheet-scroll" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
        <view class="sheet-card">
          <view v-for="section in sections" :key="section.name" class="section">
            <view class="section-name">{{ section.name }}</view>
            <view v-for="(line, index) in section.lines" :key="index" class="line-block">
              <view v-if="line.chordLine" class="chord-line" :style="{ fontSize: fontSize + 'rpx' }">{{ line.chordLine }}</view>
              <view class="lyric-line" :style="{ fontSize: fontSize + 4 + 'rpx' }">{{ line.lyricLine }}</view>
            </view>
          </view>
          <view class="ending-space">练习结束，给手指放个小假。</view>
        </view>
      </scroll-view>

      <view class="bottom-panel">
        <view class="panel-btn" @tap="fontSize = Math.max(26, fontSize - 2)">A-</view>
        <view class="panel-btn" @tap="fontSize = Math.min(48, fontSize + 2)">A+</view>
        <view class="panel-btn" @tap="savePractice">保存记录</view>
      </view>
    </view>

    <EmptyState v-else icon="♬" title="练习谱加载中" desc="正在调弦，请稍等" />
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavBar from '../../components/AppNavBar.vue'
import EmptyState from '../../components/EmptyState.vue'
import { getSongDetail } from '../../api/songs'
import { createPracticeRecord } from '../../api/practice'
import { loginWithWechatProfile } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'
import type { Song, SongSection } from '../../types'

const song = ref<Song | null>(null)
const playing = ref(false)
const scrollTop = ref(0)
const scrollSpeed = ref(2)
const fontSize = ref(32)
const startedAt = ref<number | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

const sections = computed<SongSection[]>(() => {
  const data = song.value?.content_json
  if (data?.sections?.length) return data.sections
  return [
    {
      name: '主歌',
      lines: [
        { chordLine: 'C              G', lyricLine: '这里会显示歌词和和弦' },
        { chordLine: 'Am             F', lyricLine: '跟着滚谱慢慢练' },
      ],
    },
  ]
})

onLoad(async (query) => {
  const id = Number(query?.id)
  if (id) song.value = await getSongDetail(id)
})

onUnmounted(() => {
  stopTimer()
})

function startTimer() {
  if (timer) return
  if (!startedAt.value) startedAt.value = Date.now()
  timer = setInterval(() => {
    scrollTop.value += scrollSpeed.value
  }, 120)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function togglePlaying() {
  playing.value = !playing.value
  if (playing.value) startTimer()
  else stopTimer()
}

function increaseSpeed() {
  scrollSpeed.value = Math.min(8, scrollSpeed.value + 1)
}

function decreaseSpeed() {
  scrollSpeed.value = Math.max(1, scrollSpeed.value - 1)
}

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

async function savePractice() {
  if (!song.value) return
  await ensureLogin()
  const duration = startedAt.value ? Math.floor((Date.now() - startedAt.value) / 1000) : 0
  await createPracticeRecord({
    song_id: song.value.id,
    duration_seconds: duration,
    bpm: song.value.bpm,
    scroll_speed: scrollSpeed.value,
    practiced_sections: { sections: sections.value.map((item) => item.name) },
  })
  uni.showToast({ title: '练习已保存', icon: 'success' })
}
</script>

<style scoped lang="scss">
.practice-page {
  min-height: 100vh;
  background: #fafaf6;
}

.practice-container {
  padding: 0 24rpx 32rpx;
}

.control-card {
  padding: 28rpx;
  border-radius: 36rpx;
  background: #fff;
  box-shadow: 0 12rpx 40rpx rgba(18, 60, 50, 0.08);
}

.song-title {
  color: #123c32;
  font-size: 36rpx;
  font-weight: 900;
}

.song-meta {
  margin-top: 10rpx;
  color: #687078;
  font-size: 24rpx;
}

.controls {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.control-btn {
  flex: 1;
  height: 68rpx;
  border-radius: 34rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  font-size: 24rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn.primary {
  background: #1e7a5a;
  color: #fff;
}

.speed-text {
  margin-top: 18rpx;
  color: #a0a7ae;
  font-size: 22rpx;
}

.sheet-scroll {
  margin-top: 22rpx;
  height: calc(100vh - 390rpx);
}

.sheet-card {
  padding: 40rpx 34rpx 140rpx;
  border-radius: 40rpx;
  background: #fff;
}

.section + .section {
  margin-top: 54rpx;
}

.section-name {
  color: #123c32;
  font-size: 34rpx;
  font-weight: 900;
  margin-bottom: 30rpx;
}

.line-block + .line-block {
  margin-top: 34rpx;
}

.chord-line {
  color: #1e7a5a;
  font-weight: 900;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
}

.lyric-line {
  margin-top: 10rpx;
  color: #1f2428;
  line-height: 1.75;
}

.ending-space {
  margin-top: 80rpx;
  color: #a0a7ae;
  font-size: 26rpx;
  text-align: center;
}

.bottom-panel {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 34rpx;
  padding: 18rpx;
  border-radius: 40rpx;
  background: #123c32;
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 14rpx;
}

.panel-btn {
  height: 70rpx;
  border-radius: 35rpx;
  background: #fff3cf;
  color: #123c32;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 900;
}
</style>
