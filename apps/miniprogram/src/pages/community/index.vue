<template>
  <view class="page">
    <view class="hero-card">
      <view class="hero-top">
        <view>
          <text class="eyebrow">GUITAR TUNER</text>
          <text class="page-title">吉他调音器</text>
        </view>
        <view class="status-pill">{{ currentTuning.name }}</view>
      </view>
      <text class="hero-desc">打开麦克风后拨动琴弦，谱灵会识别音高并给出偏高、偏低和已调准提示。也可以播放标准音进行手动校准。</text>
    </view>

    <view class="mode-card">
      <view
        v-for="mode in tuningModes"
        :key="mode.key"
        class="mode-pill"
        :class="{ active: mode.key === tuningKey }"
        @tap="selectTuning(mode.key)"
      >
        {{ mode.name }}
      </view>
    </view>

    <view class="note-card" :class="statusClass">
      <view class="listen-state">
        <view class="state-dot" :class="{ active: listening }" />
        <text class="state-text">{{ listenText }}</text>
      </view>

      <view class="note-display">
        <text class="current-string">{{ currentString.label }} · 目标音</text>
        <text class="current-note">{{ currentString.note }}</text>
        <text class="current-frequency">{{ currentString.frequency.toFixed(2) }} Hz</text>
      </view>

      <view class="detected-panel">
        <view>
          <text class="detected-label">识别音高</text>
          <text class="detected-value">{{ detectedFrequency ? `${detectedNote} · ${detectedFrequency.toFixed(1)} Hz` : '等待拨弦' }}</text>
        </view>
        <view class="cents-box" :class="statusClass">
          <text class="cents-value">{{ centsText }}</text>
          <text class="cents-label">音分</text>
        </view>
      </view>

      <view class="meter">
        <view class="meter-line" />
        <view class="meter-zone meter-zone--left">偏低</view>
        <view class="meter-zone meter-zone--right">偏高</view>
        <view class="meter-center" />
        <view class="meter-dot" :style="meterDotStyle" />
      </view>
      <text class="meter-tip">{{ tuneTip }}</text>
    </view>

    <view class="string-grid">
      <view
        v-for="item in strings"
        :key="item.key"
        class="string-item"
        :class="{ active: item.key === currentKey, inTune: item.key === currentKey && isInTune }"
        @tap="selectString(item.key)"
      >
        <text class="string-label">{{ item.label }}</text>
        <text class="string-note">{{ item.note }}</text>
        <text class="string-freq">{{ item.frequency.toFixed(2) }}Hz</text>
      </view>
    </view>

    <view class="actions-card">
      <view class="primary-btn" :class="{ listening }" @tap="toggleListening">
        {{ listening ? '停止识别' : '开始调音' }}
      </view>
      <view class="tone-btn" :class="{ playing }" @tap="playTone">
        {{ playing ? '播放中' : '标准音' }}
      </view>
    </view>

    <view class="options-card">
      <view class="option-row" @tap="autoString = !autoString">
        <view>
          <text class="option-title">自动识别琴弦</text>
          <text class="option-desc">根据当前音高自动匹配最近的目标弦</text>
        </view>
        <view class="switch" :class="{ active: autoString }"><view class="switch-dot" /></view>
      </view>
      <view class="option-row" @tap="noiseGate = noiseGate === 'normal' ? 'low' : 'normal'">
        <view>
          <text class="option-title">拾音灵敏度</text>
          <text class="option-desc">{{ noiseGate === 'normal' ? '标准环境，适合普通房间' : '高灵敏度，适合安静环境' }}</text>
        </view>
        <view class="mini-pill">{{ noiseGate === 'normal' ? '标准' : '灵敏' }}</view>
      </view>
    </view>

    <view class="tips-card">
      <text class="tips-title">调音建议</text>
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

interface TuningMode {
  key: string
  name: string
  strings: GuitarString[]
}

type TuneStatus = 'idle' | 'low' | 'high' | 'inTune' | 'noisy'

type NoiseGate = 'normal' | 'low'

const tuningModes: TuningMode[] = [
  {
    key: 'standard',
    name: '标准调弦',
    strings: [
      { key: 'e4', label: '1弦', note: 'E4', frequency: 329.63 },
      { key: 'b3', label: '2弦', note: 'B3', frequency: 246.94 },
      { key: 'g3', label: '3弦', note: 'G3', frequency: 196.00 },
      { key: 'd3', label: '4弦', note: 'D3', frequency: 146.83 },
      { key: 'a2', label: '5弦', note: 'A2', frequency: 110.00 },
      { key: 'e2', label: '6弦', note: 'E2', frequency: 82.41 },
    ],
  },
  {
    key: 'dropD',
    name: 'Drop D',
    strings: [
      { key: 'e4', label: '1弦', note: 'E4', frequency: 329.63 },
      { key: 'b3', label: '2弦', note: 'B3', frequency: 246.94 },
      { key: 'g3', label: '3弦', note: 'G3', frequency: 196.00 },
      { key: 'd3', label: '4弦', note: 'D3', frequency: 146.83 },
      { key: 'a2', label: '5弦', note: 'A2', frequency: 110.00 },
      { key: 'd2', label: '6弦', note: 'D2', frequency: 73.42 },
    ],
  },
  {
    key: 'halfDown',
    name: '半音降弦',
    strings: [
      { key: 'eb4', label: '1弦', note: 'Eb4', frequency: 311.13 },
      { key: 'bb3', label: '2弦', note: 'Bb3', frequency: 233.08 },
      { key: 'gb3', label: '3弦', note: 'Gb3', frequency: 185.00 },
      { key: 'db3', label: '4弦', note: 'Db3', frequency: 138.59 },
      { key: 'ab2', label: '5弦', note: 'Ab2', frequency: 103.83 },
      { key: 'eb2', label: '6弦', note: 'Eb2', frequency: 77.78 },
    ],
  },
]

const tips = [
  '拨弦后等音高稳定再微调，指针进入绿色区域即可。',
  '偏低时慢慢拧紧琴钮；偏高时先放松一点，再重新拧回目标音。',
  '建议从 6 弦到 1 弦依次调，调完后再复查一遍。',
]

const tuningKey = ref('standard')
const currentKey = ref('e2')
const listening = ref(false)
const playing = ref(false)
const autoString = ref(true)
const noiseGate = ref<NoiseGate>('normal')
const detectedFrequency = ref(0)
const detectedNote = ref('--')
const cents = ref(0)
const status = ref<TuneStatus>('idle')

let recorderManager: any = null
let audioContext: any = null
let oscillator: any = null
let gainNode: any = null
let mediaStream: any = null
let analyser: any = null
let rafId = 0
let stopTimer: ReturnType<typeof setTimeout> | null = null
let lastAnalyzeTime = 0

const currentTuning = computed(() => tuningModes.find((item) => item.key === tuningKey.value) || tuningModes[0])
const strings = computed(() => currentTuning.value.strings)
const currentString = computed(() => strings.value.find((item) => item.key === currentKey.value) || strings.value[strings.value.length - 1])
const isInTune = computed(() => Math.abs(cents.value) <= 5 && detectedFrequency.value > 0)

const statusClass = computed(() => {
  if (status.value === 'inTune') return 'status-inTune'
  if (status.value === 'low') return 'status-low'
  if (status.value === 'high') return 'status-high'
  if (status.value === 'noisy') return 'status-noisy'
  return 'status-idle'
})

const listenText = computed(() => {
  if (listening.value && status.value === 'inTune') return '音准良好'
  if (listening.value && status.value === 'low') return '当前偏低'
  if (listening.value && status.value === 'high') return '当前偏高'
  if (listening.value && status.value === 'noisy') return '请靠近琴弦再拨一次'
  if (listening.value) return '正在识别音高'
  return '麦克风调音未开启'
})

const tuneTip = computed(() => {
  if (!detectedFrequency.value) return listening.value ? '拨动当前琴弦，保持周围安静。' : '点击开始调音，或播放标准音手动校准。'
  if (isInTune.value) return '已接近目标音，保持当前张力即可。'
  if (cents.value < -5) return '音偏低，慢慢拧紧琴钮。'
  if (cents.value > 5) return '音偏高，先放松一点，再调回目标音。'
  return '继续微调，让指针靠近中心。'
})

const centsText = computed(() => {
  if (!detectedFrequency.value) return '--'
  const value = Math.round(cents.value)
  if (value > 0) return `+${value}`
  return String(value)
})

const meterDotStyle = computed(() => {
  const safe = Math.max(-50, Math.min(50, cents.value || 0))
  return `transform: translateX(${safe * 4.8}rpx);`
})

function selectTuning(key: string) {
  tuningKey.value = key
  currentKey.value = currentTuning.value.strings[currentTuning.value.strings.length - 1].key
  resetDetection()
}

function selectString(key: string) {
  currentKey.value = key
  updateCents(detectedFrequency.value)
  if (playing.value) playTone()
}

function resetDetection() {
  detectedFrequency.value = 0
  detectedNote.value = '--'
  cents.value = 0
  status.value = listening.value ? 'noisy' : 'idle'
}

function updateCents(frequency: number) {
  if (!frequency) {
    cents.value = 0
    return
  }
  cents.value = 1200 * Math.log2(frequency / currentString.value.frequency)
  if (Math.abs(cents.value) <= 5) status.value = 'inTune'
  else status.value = cents.value < 0 ? 'low' : 'high'
}

function findNearestString(frequency: number) {
  return strings.value
    .map((item) => ({ item, distance: Math.abs(1200 * Math.log2(frequency / item.frequency)) }))
    .sort((a, b) => a.distance - b.distance)[0]?.item
}

function handleDetectedFrequency(frequency: number) {
  if (!frequency || frequency < 60 || frequency > 420) {
    status.value = 'noisy'
    return
  }

  const nearest = findNearestString(frequency)
  if (autoString.value && nearest) currentKey.value = nearest.key

  detectedFrequency.value = frequency
  detectedNote.value = noteNameFromFrequency(frequency)
  updateCents(frequency)
}

function noteNameFromFrequency(frequency: number) {
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440))
  const name = names[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

function toggleListening() {
  if (listening.value) stopListening()
  else startListening()
}

async function startListening() {
  resetDetection()

  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined') {
    try {
      await ensureRecordPermission()
      startMiniProgramRecorder()
      return
    } catch (error: any) {
      uni.showModal({
        title: '需要麦克风权限',
        content: error?.message || '请允许麦克风权限后使用自动调音。',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm && wx.openSetting) wx.openSetting({})
        },
      })
      return
    }
  }
  // #endif

  startWebAudioTuner()
}

function ensureRecordPermission() {
  return new Promise<void>((resolve, reject) => {
    wx.getSetting({
      success: (setting: any) => {
        if (setting.authSetting?.['scope.record']) {
          resolve()
          return
        }
        wx.authorize({
          scope: 'scope.record',
          success: () => resolve(),
          fail: () => reject(new Error('麦克风权限未开启')),
        })
      },
      fail: () => reject(new Error('无法读取权限状态')),
    })
  })
}

function startMiniProgramRecorder() {
  stopListening(false)
  recorderManager = wx.getRecorderManager()
  recorderManager.onStart(() => {
    listening.value = true
    status.value = 'noisy'
  })
  recorderManager.onError((error: any) => {
    listening.value = false
    status.value = 'idle'
    uni.showToast({ title: error?.errMsg || '麦克风启动失败', icon: 'none' })
  })
  recorderManager.onFrameRecorded((res: any) => {
    const now = Date.now()
    if (now - lastAnalyzeTime < 120) return
    lastAnalyzeTime = now
    const pcm = pcm16ToFloat32(res.frameBuffer)
    const pitch = detectPitch(pcm, 44100)
    handleDetectedFrequency(pitch)
  })
  recorderManager.start({
    duration: 600000,
    sampleRate: 44100,
    numberOfChannels: 1,
    encodeBitRate: 96000,
    format: 'PCM',
    frameSize: 8,
  })
}

function startWebAudioTuner() {
  const nav = typeof navigator !== 'undefined' ? navigator as any : null
  const win = typeof window !== 'undefined' ? window as any : null
  if (!nav?.mediaDevices?.getUserMedia || !win) {
    uni.showToast({ title: '当前环境暂不支持麦克风调音', icon: 'none' })
    return
  }

  nav.mediaDevices.getUserMedia({ audio: true }).then((stream: any) => {
    const AudioContext = win.AudioContext || win.webkitAudioContext
    audioContext = audioContext || new AudioContext()
    mediaStream = stream
    const source = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 4096
    source.connect(analyser)
    listening.value = true
    status.value = 'noisy'
    analyzeWebAudio()
  }).catch(() => {
    uni.showToast({ title: '麦克风权限未开启', icon: 'none' })
  })
}

function analyzeWebAudio() {
  if (!listening.value || !analyser || !audioContext) return
  const buffer = new Float32Array(analyser.fftSize)
  analyser.getFloatTimeDomainData(buffer)
  const pitch = detectPitch(buffer, audioContext.sampleRate || 44100)
  handleDetectedFrequency(pitch)
  rafId = requestAnimationFrame(analyzeWebAudio)
}

function stopListening(showToast = true) {
  try {
    if (recorderManager) recorderManager.stop()
  } catch (_error) {}
  try {
    if (mediaStream) mediaStream.getTracks().forEach((track: any) => track.stop())
  } catch (_error) {}
  if (rafId) cancelAnimationFrame(rafId)
  listening.value = false
  mediaStream = null
  analyser = null
  status.value = 'idle'
  if (showToast) uni.showToast({ title: '已停止调音', icon: 'none' })
}

function pcm16ToFloat32(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const length = Math.floor(view.byteLength / 2)
  const output = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    output[i] = view.getInt16(i * 2, true) / 32768
  }
  return output
}

function detectPitch(buffer: Float32Array, sampleRate: number) {
  const rms = Math.sqrt(buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length)
  const minRms = noiseGate.value === 'normal' ? 0.018 : 0.008
  if (rms < minRms) return 0

  let start = 0
  let end = buffer.length - 1
  const threshold = 0.2
  for (let i = 0; i < buffer.length / 2; i += 1) {
    if (Math.abs(buffer[i]) < threshold) {
      start = i
      break
    }
  }
  for (let i = 1; i < buffer.length / 2; i += 1) {
    if (Math.abs(buffer[buffer.length - i]) < threshold) {
      end = buffer.length - i
      break
    }
  }

  const slice = buffer.slice(start, end)
  const minLag = Math.floor(sampleRate / 420)
  const maxLag = Math.floor(sampleRate / 60)
  let bestLag = -1
  let bestCorrelation = 0

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0
    for (let i = 0; i < slice.length - lag; i += 1) {
      correlation += slice[i] * slice[i + lag]
    }
    correlation = correlation / (slice.length - lag)
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }

  if (bestLag <= 0 || bestCorrelation < 0.01) return 0
  return sampleRate / bestLag
}

function ensureAudioContext() {
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.createWebAudioContext) {
    audioContext = audioContext || wx.createWebAudioContext()
    return audioContext
  }
  // #endif

  const win = typeof window !== 'undefined' ? window as any : null
  if (!win) return null
  const AudioContext = win.AudioContext || win.webkitAudioContext
  if (!AudioContext) return null
  audioContext = audioContext || new AudioContext()
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
  if (!ctx?.createOscillator) {
    uni.showToast({ title: '当前环境暂不支持标准音播放', icon: 'none' })
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

onBeforeUnmount(() => {
  stopTone()
  stopListening(false)
})
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
.mode-card,
.note-card,
.actions-card,
.options-card,
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

.mode-card {
  margin-top: 22rpx;
  padding: 14rpx;
  display: flex;
  gap: 12rpx;
}

.mode-pill {
  flex: 1;
  height: 58rpx;
  border-radius: 999rpx;
  background: #F6FAF8;
  color: #5F6B65;
  font-size: 23rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-pill.active {
  background: #0BA45A;
  color: #FFFFFF;
}

.note-card {
  margin-top: 24rpx;
  padding: 28rpx;
}

.listen-state {
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-dot {
  width: 14rpx;
  height: 14rpx;
  margin-right: 10rpx;
  border-radius: 999rpx;
  background: #C8D4CE;
}

.state-dot.active {
  background: #0BA45A;
  box-shadow: 0 0 0 8rpx rgba(11, 164, 90, 0.12);
}

.state-text {
  color: #5F6B65;
  font-size: 24rpx;
  font-weight: 800;
}

.note-display {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.current-string {
  color: #5F6B65;
  font-size: 25rpx;
  font-weight: 800;
}

.current-note {
  margin-top: 8rpx;
  color: #0BA45A;
  font-size: 92rpx;
  line-height: 104rpx;
  font-weight: 900;
}

.current-frequency {
  color: #5F6B65;
  font-size: 24rpx;
  font-weight: 700;
}

.detected-panel {
  margin-top: 24rpx;
  padding: 18rpx;
  border-radius: 24rpx;
  background: #F6FBF8;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detected-label {
  display: block;
  color: #7B8580;
  font-size: 21rpx;
  line-height: 28rpx;
}

.detected-value {
  display: block;
  margin-top: 5rpx;
  color: #17231E;
  font-size: 28rpx;
  line-height: 34rpx;
  font-weight: 900;
}

.cents-box {
  width: 112rpx;
  height: 86rpx;
  border-radius: 22rpx;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.cents-value {
  color: #17231E;
  font-size: 30rpx;
  line-height: 34rpx;
  font-weight: 900;
}

.cents-label {
  margin-top: 4rpx;
  color: #7B8580;
  font-size: 19rpx;
}

.cents-box.status-inTune {
  background: #EAF8F0;
}

.cents-box.status-inTune .cents-value {
  color: #0BA45A;
}

.cents-box.status-low,
.cents-box.status-high {
  background: #FFF7E8;
}

.cents-box.status-low .cents-value,
.cents-box.status-high .cents-value {
  color: #B66D00;
}

.meter {
  position: relative;
  height: 108rpx;
  margin-top: 24rpx;
}

.meter-line {
  position: absolute;
  left: 48rpx;
  right: 48rpx;
  top: 49rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #F0C36A 0%, #F0C36A 30%, #0BA45A 48%, #0BA45A 52%, #F0C36A 70%, #F0C36A 100%);
}

.meter-zone {
  position: absolute;
  top: 72rpx;
  color: #9AA49F;
  font-size: 20rpx;
  font-weight: 800;
}

.meter-zone--left {
  left: 58rpx;
}

.meter-zone--right {
  right: 58rpx;
}

.meter-center {
  position: absolute;
  left: 50%;
  top: 22rpx;
  width: 4rpx;
  height: 62rpx;
  border-radius: 999rpx;
  background: #17231E;
}

.meter-dot {
  position: absolute;
  left: calc(50% - 16rpx);
  top: 36rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 999rpx;
  background: #0BA45A;
  box-shadow: 0 8rpx 18rpx rgba(11, 164, 90, 0.24);
  transition: transform .12s ease-out;
}

.status-low .meter-dot,
.status-high .meter-dot {
  background: #F0B84D;
}

.status-inTune .meter-dot {
  background: #0BA45A;
  box-shadow: 0 0 0 10rpx rgba(11, 164, 90, 0.12), 0 8rpx 18rpx rgba(11, 164, 90, 0.24);
}

.meter-tip {
  display: block;
  text-align: center;
  color: #5F6B65;
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 800;
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

.string-item.inTune {
  box-shadow: 0 0 0 8rpx rgba(11, 164, 90, 0.1), 0 8rpx 22rpx rgba(18, 52, 36, 0.04);
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
.tone-btn {
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

.primary-btn.listening {
  background: #17231E;
}

.tone-btn {
  background: #F6FAF8;
  color: #5F6B65;
  border: 1rpx solid #E8EFEA;
}

.tone-btn.playing {
  color: #0BA45A;
  background: #EAF8F0;
}

.options-card {
  margin-top: 24rpx;
  padding: 6rpx 22rpx;
}

.option-row {
  min-height: 96rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #E8EFEA;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.option-row:last-child {
  border-bottom: 0;
}

.option-title {
  display: block;
  color: #17231E;
  font-size: 26rpx;
  line-height: 34rpx;
  font-weight: 900;
}

.option-desc {
  display: block;
  margin-top: 6rpx;
  color: #7B8580;
  font-size: 22rpx;
  line-height: 30rpx;
}

.switch {
  width: 86rpx;
  height: 48rpx;
  padding: 4rpx;
  border-radius: 999rpx;
  background: #DDE6E0;
  box-sizing: border-box;
  transition: background .18s ease;
}

.switch-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  transition: transform .18s ease;
}

.switch.active {
  background: #0BA45A;
}

.switch.active .switch-dot {
  transform: translateX(38rpx);
}

.mini-pill {
  min-width: 82rpx;
  height: 46rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: #EAF8F0;
  color: #0BA45A;
  font-size: 22rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
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

@media (prefers-color-scheme: dark) {
  .page { background: #0F1512; }
  .hero-card,
  .mode-card,
  .note-card,
  .actions-card,
  .options-card,
  .tips-card,
  .string-item { background: #181F1B; border-color: rgba(255,255,255,.1); }
  .page-title,
  .detected-value,
  .option-title,
  .tips-title,
  .string-note { color: #F4F7F5; }
  .hero-desc,
  .state-text,
  .current-string,
  .current-frequency,
  .meter-tip,
  .option-desc,
  .tip-text,
  .string-label,
  .string-freq { color: #AEBBB4; }
  .detected-panel,
  .tone-btn,
  .mode-pill { background: rgba(255,255,255,.06); }
  .meter-center { background: #FFFFFF; }
}
</style>