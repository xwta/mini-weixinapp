<template>
  <view class="practice-page">
    <AppNavBar title="练习模式" :subtitle="song?.title || '边看边弹，节奏别慌'" show-back />

    <view v-if="song" class="practice-container">
      <view class="control-card">
        <view class="song-title">{{ song.title }}</view>
        <view class="song-meta">{{ displayKey }}调 · {{ song.bpm || 86 }} BPM · {{ song.capo || '0品' }}</view>
        <view v-if="transposeOffset" class="transpose-tip">
          当前转调 {{ transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset }} 半音
          <text class="reset-link" @tap="resetTranspose">恢复原调</text>
        </view>
        <view class="controls">
          <view class="control-btn primary" @tap="togglePlaying">{{ playing ? '暂停滚谱' : '开始滚谱' }}</view>
          <view class="control-btn" @tap="decreaseSpeed">慢一点</view>
          <view class="control-btn" @tap="increaseSpeed">快一点</view>
        </view>
        <view class="transpose-row">
          <view class="mini-btn" @tap="transposeDown">降调</view>
          <view class="mini-btn" @tap="transposeUp">升调</view>
          <view class="mini-btn" @tap="scrollTop = 0">回顶部</view>
        </view>
        <view class="speed-text">滚动速度：{{ scrollSpeed }} · 字号：{{ fontSize }}rpx</view>
      </view>

      <scroll-view class="sheet-scroll" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
        <view class="sheet-card">
          <view v-for="section in sections" :key="section.name" class="section">
            <view class="section-name">{{ section.name }}</view>
            <view v-for="(line, index) in section.lines" :key="index" class="line-block">
              <view v-if="line.chordLine" class="chord-line" :style="{ fontSize: fontSize + 'rpx' }">
                <text v-for="(part, partIndex) in splitChordLine(line.chordLine)" :key="partIndex" :class="part.isChord ? 'chord-token' : 'chord-space'">{{ part.text }}</text>
              </view>
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

    <EmptyState v-else icon="♬" title="练习谱加载中" desc="正在准备谱面" />
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
const transposeOffset = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const SHARP_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const FLAT_TO_SHARP: Record<string, string> = { 'Db': 'C#', 'D♭': 'C#', 'Eb': 'Eb', 'E♭': 'Eb', 'Gb': 'F#', 'G♭': 'F#', 'Ab': 'Ab', 'A♭': 'Ab', 'Bb': 'Bb', 'B♭': 'Bb' }
const CHORD_RE = /^([A-G](?:#|b|♭)?)(.*)$/
const CHORD_TOKEN_RE = /([A-G](?:#|b|♭)?(?:m|maj|min|dim|aug|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:\/[A-G](?:#|b|♭)?)?)/g

const originalKey = computed(() => normalizeNoteName(String(song.value?.song_key || 'C').replace(/调/g, '')) || 'C')
const displayKey = computed(() => transposeNote(originalKey.value, transposeOffset.value))

const baseSections = computed<SongSection[]>(() => {
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

const sections = computed<SongSection[]>(() => {
  if (!transposeOffset.value) return baseSections.value
  return baseSections.value.map(section => ({
    ...section,
    lines: section.lines.map(line => ({
      ...line,
      chordLine: transposeChordLine(line.chordLine || '', transposeOffset.value),
    })),
  }))
})

onLoad(async (query) => {
  const id = String(query?.id || '')
  const offset = Number(query?.transpose || 0)
  transposeOffset.value = Number.isFinite(offset) ? offset : 0
  if (id) song.value = await getSongDetail(id)
})

onUnmounted(() => {
  stopTimer()
})

function normalizeNoteName(note = '') {
  const clean = note.replace(/♯/g, '#').replace(/\s/g, '')
  if (FLAT_TO_SHARP[clean]) return FLAT_TO_SHARP[clean]
  return SHARP_NOTES.includes(clean) ? clean : clean.match(/[A-G](?:#|b|♭)?/)?.[0] || 'C'
}

function transposeNote(note = '', offset = 0) {
  const normalized = normalizeNoteName(note)
  const index = SHARP_NOTES.indexOf(normalized)
  if (index < 0) return note
  return SHARP_NOTES[(index + offset + 1200) % 12]
}

function transposeChordRoot(part = '', offset = 0) {
  const match = part.match(CHORD_RE)
  if (!match) return part
  return `${transposeNote(match[1], offset)}${match[2] || ''}`
}

function transposeChordToken(token = '', offset = 0) {
  const slashParts = token.split('/')
  const main = transposeChordRoot(slashParts[0], offset)
  if (slashParts.length === 1) return main
  return `${main}/${transposeChordRoot(slashParts[1], offset)}`
}

function transposeChordLine(line = '', offset = 0) {
  return line.replace(CHORD_TOKEN_RE, (match) => transposeChordToken(match, offset))
}

function splitChordLine(line = '') {
  const result: { text: string; isChord: boolean }[] = []
  let lastIndex = 0
  line.replace(CHORD_TOKEN_RE, (match, _token, offset) => {
    if (offset > lastIndex) result.push({ text: line.slice(lastIndex, offset), isChord: false })
    result.push({ text: match, isChord: true })
    lastIndex = offset + match.length
    return match
  })
  if (lastIndex < line.length) result.push({ text: line.slice(lastIndex), isChord: false })
  return result.length ? result : [{ text: line, isChord: false }]
}

function transposeUp() {
  transposeOffset.value += 1
  uni.showToast({ title: `已升调至 ${displayKey.value}`, icon: 'none' })
}

function transposeDown() {
  transposeOffset.value -= 1
  uni.showToast({ title: `已降调至 ${displayKey.value}`, icon: 'none' })
}

function resetTranspose() {
  transposeOffset.value = 0
}

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
    practiced_sections: { sections: sections.value.map((item) => item.name), transpose: transposeOffset.value, key: displayKey.value },
  })
  uni.showToast({ title: '练习已保存', icon: 'success' })
}
</script>

<style scoped lang="scss">
.practice-page { min-height: 100vh; background: #fafaf6; }
.practice-container { padding: 0 24rpx 32rpx; }
.control-card { padding: 28rpx; border-radius: 36rpx; background: #fff; box-shadow: 0 12rpx 40rpx rgba(18, 60, 50, 0.08); }
.song-title { color: #123c32; font-size: 36rpx; font-weight: 900; }
.song-meta { margin-top: 10rpx; color: #687078; font-size: 24rpx; }
.transpose-tip { margin-top: 14rpx; padding: 12rpx 16rpx; border-radius: 18rpx; background: #fff8e8; color: #9a6714; font-size: 22rpx; line-height: 30rpx; }
.reset-link { margin-left: 18rpx; color: #0ba45a; font-weight: 900; }
.controls { margin-top: 24rpx; display: flex; gap: 16rpx; }
.control-btn { flex: 1; height: 68rpx; border-radius: 34rpx; background: #e8f7f0; color: #1e7a5a; font-size: 24rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.control-btn.primary { background: #1e7a5a; color: #fff; }
.transpose-row { margin-top: 16rpx; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; }
.mini-btn { height: 58rpx; border-radius: 999rpx; background: #f6faf8; color: #123c32; border: 1rpx solid #e3ebe7; display: flex; align-items: center; justify-content: center; font-size: 23rpx; font-weight: 900; }
.speed-text { margin-top: 18rpx; color: #a0a7ae; font-size: 22rpx; }
.sheet-scroll { margin-top: 22rpx; height: calc(100vh - 466rpx); }
.sheet-card { padding: 40rpx 34rpx 140rpx; border-radius: 40rpx; background: #fff; }
.section + .section { margin-top: 54rpx; }
.section-name { color: #123c32; font-size: 34rpx; font-weight: 900; margin-bottom: 30rpx; }
.line-block + .line-block { margin-top: 34rpx; }
.chord-line { color: #1e7a5a; font-weight: 900; font-family: 'Courier New', monospace; white-space: pre-wrap; line-height: 1.4; }
.chord-token { color: #0ba45a; background: rgba(11, 164, 90, 0.08); border-radius: 8rpx; padding: 0 4rpx; }
.chord-space { color: transparent; white-space: pre-wrap; }
.lyric-line { margin-top: 10rpx; color: #1f2428; line-height: 1.75; }
.ending-space { margin-top: 80rpx; color: #a0a7ae; font-size: 26rpx; text-align: center; }
.bottom-panel { position: fixed; left: 24rpx; right: 24rpx; bottom: 34rpx; padding: 18rpx; border-radius: 40rpx; background: #123c32; display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 14rpx; }
.panel-btn { height: 70rpx; border-radius: 35rpx; background: #fff3cf; color: #123c32; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 900; }
</style>