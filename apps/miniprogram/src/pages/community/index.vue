<template>
  <view class="page">
    <view class="hero-card">
      <view class="hero-top">
        <view>
          <text class="eyebrow">GUITAR TUNER</text>
          <text class="page-title">吉他调音器</text>
        </view>
        <view class="status-pill">标准调弦</view>
      </view>
      <text class="hero-desc">选择琴弦，听标准音后调节琴弦。当前为免麦克风审核版，不采集录音、不上传声音。</text>
    </view>

    <view class="note-card">
      <view class="note-display">
        <text class="current-string">{{ currentString.label }}</text>
        <text class="current-note">{{ currentString.note }}</text>
        <text class="current-frequency">{{ currentString.frequency }} Hz</text>
      </view>
      <view class="meter">
        <view class="meter-line" />
        <view class="meter-center" />
        <view class="meter-dot" />
      </view>
      <text class="meter-tip">播放参考音，调到声音贴近即可。</text>
    </view>

    <view class="string-grid">
      <view
        v-for="item in strings"
        :key="item.key"
        class="string-item"
        :class="{ active: item.key === currentKey }"
        @tap="selectString(item.key)"
      >
        <text class="string-label">{{ item.label }}</text>
        <text class="string-note">{{ item.note }}</text>
        <text class="string-freq">{{ item.frequency }}Hz</text>
      </view>
    </view>

    <view class="actions-card">
      <view class="primary-btn" :class="{ playing }" @tap="playTone">
        {{ playing ? '播放中' : '播放参考音' }}
      </view>
      <view class="ghost-btn" @tap="stopTone">停止</view>
    </view>

    <view class="tips-card">
      <text class="tips-title">调音小贴士</text>
      <view class="tip-row" v-for="tip in tips" :key="tip">
        <text class="tip-dot">♪</text>
        <text class="tip-text">{{ tip }}</text>
      </view>
    </view>

    <AppBottomTab active="tuner" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppBottomTab from '@/components/home/AppBottomTab.vue'

interface GuitarString {
  key: string
  label: string
  note: string
  frequency: number
}

const strings: GuitarString[] = [
  { key: 'e4', label: '1弦', note: 'E4', frequency: 329.63 },
  { key: 'b3', label: '2弦', note: 'B3', frequency: 246.94 },
  { key: 'g3', label: '3弦', note: 'G3', frequency: 196.00 },
  { key: 'd3', label: '4弦', note: 'D3', frequency: 146.83 },
  { key: 'a2', label: '5弦', note: 'A2', frequency: 110.00 },
  { key: 'e2', label: '6弦', note: 'E2', frequency: 82.41 },
]

const tips = [
  '先从 6 弦到 1 弦依次调，避免琴颈受力忽然变化。',
  '新手建议微调，每次只拧一点点，听准后再继续。',
  '如果琴弦偏低，慢慢拧紧；如果偏高，先放松再调回目标音。',
]

const currentKey = ref('e4')
const playing = ref(false)
let audioContext: any = null
let oscillator: any = null
let gainNode: any = null
let stopTimer: ReturnType<typeof setTimeout> | null = null

const currentString = computed(() => strings.find((item) => item.key === currentKey.value) || strings[0])

function selectString(key: string) {
  currentKey.value = key
  if (playing.value) playTone()
}

function ensureAudioContext() {
  const win = typeof window !== 'undefined' ? window as any : null
  if (!win) return null
  const AudioContext = win.AudioContext || win.webkitAudioContext
  if (!AudioContext) return null
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

function stopTone() {
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
  try {
    if (oscillator) oscillator.stop()
  } catch (_error) {}
  try {
    if (oscillator) oscillator.disconnect()
    if (gainNode) gainNode.disconnect()
  } catch (_error) {}
  oscillator = null
  gainNode = null
  playing.value = false
}

function playTone() {
  const ctx = ensureAudioContext()
  if (!ctx) {
    uni.showToast({ title: '当前环境暂不支持播放参考音', icon: 'none' })
    return
  }

  stopTone()
  oscillator = ctx.createOscillator()
  gainNode = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = currentString.value.frequency
  gainNode.gain.value = 0.16
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.start()
  playing.value = true
  stopTimer = setTimeout(stopTone, 2600)
}

function goMain(url: string) {
  uni.reLaunch({ url })
}

function handleTabChange(value: string) {
  if (value === 'tuner') return
  if (value === 'chat') goMain('/pages/chat/index')
  if (value === 'mine') goMain('/pages/mine/index')
}

onBeforeUnmount(stopTone)
</script>

<style scoped>
.page {
  width: 750rpx;
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top) + 112rpx) 32rpx 144rpx;
  box-sizing: border-box;
  background: #F6FBF8;
}

.hero-card,
.note-card,
.actions-card,
.tips-card {
  width: 686rpx;
  box-sizing: border-box;
  border-radius: 32rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-shadow: 0 10rpx 30rpx rgba(18, 52, 36, 0.05);
}

.hero-card {
  padding: 30rpx;
  background: linear-gradient(135deg, #EAF8F0 0%, #FFFFFF 100%);
}

.hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.eyebrow {
  display: block;
  color: #0BA45A;
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 900;
}

.page-title {
  display: block;
  margin-top: 8rpx;
  color: #17231E;
  font-size: 42rpx;
  line-height: 52rpx;
  font-weight: 900;
}

.status-pill {
  height: 52rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  color: #0BA45A;
  font-size: 23rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
}

.hero-desc {
  display: block;
  margin-top: 22rpx;
  color: #5F6B65;
  font-size: 25rpx;
  line-height: 38rpx;
}

.note-card {
  margin-top: 24rpx;
  padding: 34rpx 28rpx;
}

.note-display {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.current-string {
  color: #5F6B65;
  font-size: 26rpx;
  font-weight: 800;
}

.current-note {
  margin-top: 10rpx;
  color: #0BA45A;
  font-size: 92rpx;
  line-height: 104rpx;
  font-weight: 900;
}

.current-frequency {
  color: #5F6B65;
  font-size: 25rpx;
  font-weight: 700;
}

.meter {
  position: relative;
  height: 88rpx;
  margin-top: 28rpx;
}

.meter-line {
  position: absolute;
  left: 48rpx;
  right: 48rpx;
  top: 43rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #F0C36A 0%, #0BA45A 50%, #F0C36A 100%);
}

.meter-center {
  position: absolute;
  left: 50%;
  top: 20rpx;
  width: 4rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: #17231E;
}

.meter-dot {
  position: absolute;
  left: calc(50% - 14rpx);
  top: 32rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 999rpx;
  background: #0BA45A;
  box-shadow: 0 8rpx 18rpx rgba(11, 164, 90, 0.24);
}

.meter-tip {
  display: block;
  margin-top: 8rpx;
  text-align: center;
  color: #7B8580;
  font-size: 23rpx;
}

.string-grid {
  width: 686rpx;
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.string-item {
  height: 154rpx;
  border-radius: 26rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 22rpx rgba(18, 52, 36, 0.04);
}

.string-item.active {
  background: #0BA45A;
  border-color: #0BA45A;
}

.string-label {
  color: #5F6B65;
  font-size: 23rpx;
  font-weight: 800;
}

.string-note {
  margin-top: 8rpx;
  color: #17231E;
  font-size: 38rpx;
  font-weight: 900;
}

.string-freq {
  margin-top: 4rpx;
  color: #7B8580;
  font-size: 21rpx;
}

.string-item.active .string-label,
.string-item.active .string-note,
.string-item.active .string-freq {
  color: #FFFFFF;
}

.actions-card {
  margin-top: 24rpx;
  padding: 20rpx;
  display: flex;
  gap: 16rpx;
}

.primary-btn,
.ghost-btn {
  flex: 1;
  height: 78rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27rpx;
  font-weight: 900;
}

.primary-btn {
  background: linear-gradient(135deg, #0BB861 0%, #0BA45A 100%);
  color: #FFFFFF;
  box-shadow: 0 12rpx 24rpx rgba(16, 177, 90, 0.18);
}

.primary-btn.playing {
  opacity: 0.76;
}

.ghost-btn {
  background: #F6FAF8;
  color: #5F6B65;
  border: 1rpx solid #E8EFEA;
}

.tips-card {
  margin-top: 24rpx;
  padding: 26rpx;
}

.tips-title {
  display: block;
  color: #17231E;
  font-size: 30rpx;
  line-height: 38rpx;
  font-weight: 900;
}

.tip-row {
  margin-top: 18rpx;
  display: flex;
  align-items: flex-start;
}

.tip-dot {
  width: 34rpx;
  color: #0BA45A;
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 900;
  flex-shrink: 0;
}

.tip-text {
  flex: 1;
  min-width: 0;
  color: #5F6B65;
  font-size: 25rpx;
  line-height: 36rpx;
}
</style>