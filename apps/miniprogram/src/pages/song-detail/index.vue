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
              <view class="song-subtitle">{{ sourceLabel }} · {{ song.style || '弹唱' }} · {{ song.difficulty || '新手友好' }}</view>
            </view>
          </view>

          <view class="author-row">
            <view class="author-avatar">♪</view>
            <view class="author-info">
              <view class="author-name">{{ arrangerLabel }}</view>
              <view class="author-desc">{{ hasImageTabPages ? 'TXT谱与图片六线谱双模式' : '适合个人弹唱练习' }}</view>
            </view>
            <view class="favorite-btn" @tap.stop="handleFavorite">
              <text class="heart">♡</text>
              <text>收藏</text>
            </view>
          </view>

          <view class="param-grid">
            <view class="param-item">
              <view class="param-label">当前调</view>
              <view class="param-value">{{ displayKey }}</view>
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

        <view v-if="hasImageTabPages" class="reader-switch card">
          <view :class="['switch-item', !isImageReader && 'active']" @tap="setReaderMode('txt')">TXT谱</view>
          <view :class="['switch-item', isImageReader && 'active']" @tap="setReaderMode('image')">图片六线谱</view>
        </view>

        <view class="tool-card card">
          <view :class="['tool-btn', !isImageReader && 'active-soft']" @tap="transposeDown">
            <text class="tool-icon">↓</text>
            <text>降调</text>
          </view>
          <view :class="['tool-btn', !isImageReader && 'active-soft']" @tap="transposeUp">
            <text class="tool-icon">↑</text>
            <text>升调</text>
          </view>
          <view class="tool-btn active" @tap="startPractice">
            <text class="tool-icon">▤</text>
            <text>{{ isImageReader ? '读谱' : '滚谱' }}</text>
          </view>
          <view class="tool-btn" @tap="openMetronome">
            <text class="tool-icon">△</text>
            <text>节拍器</text>
          </view>
        </view>

        <view v-if="transposeOffset && !isImageReader" class="transpose-card">
          已转调 {{ transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset }} 半音，原调 {{ originalKey }}。
          <text class="reset-link" @tap="resetTranspose">恢复原调</text>
        </view>

        <view v-if="isImageReader" class="image-reader-card">
          <view class="reader-head">
            <view>
              <view class="reader-title">图片六线谱阅读</view>
              <view class="reader-desc">上下滑动查看，适合快速照谱练习</view>
            </view>
            <view class="page-count">{{ imageTabPages.length }}页</view>
          </view>

          <view v-for="(page, pageIndex) in imageTabPages" :key="`${page.title}-${pageIndex}`" class="tab-page">
            <view class="paper-head">
              <view class="paper-title">{{ page.title || `第${pageIndex + 1}页` }}</view>
              <view class="paper-meta">{{ displayKey }} · {{ song.capo || '0品' }} · {{ song.bpm || 86 }} BPM</view>
            </view>

            <view v-for="(block, blockIndex) in page.blocks" :key="`${pageIndex}-${blockIndex}`" class="tab-block">
              <view v-if="block.type === 'section'" class="tab-section-title">{{ block.text }}</view>
              <view v-else class="six-line-wrap">
                <text v-for="(tabLine, lineIndex) in normalizeTabLines(block.lines)" :key="lineIndex" class="six-line">{{ tabLine }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="sheet-card card">
          <view v-for="section in transposedSections" :key="section.name" class="sheet-section">
            <view class="section-title-row">
              <view class="section-mark" />
              <view class="section-name">{{ section.name }}</view>
            </view>

            <view v-for="(line, index) in section.lines" :key="index" class="sheet-line">
              <view v-if="line.chordLine" class="chord-line">
                <text v-for="(part, partIndex) in splitChordLine(line.chordLine)" :key="partIndex" :class="part.isChord ? 'chord-token' : 'chord-space'">{{ part.text }}</text>
              </view>
              <view class="lyric-line">{{ line.lyricLine }}</view>
            </view>
          </view>
        </view>

        <view v-if="sourceInfo" class="source-card">
          <view class="source-title">曲谱说明</view>
          <view class="source-text">{{ sourceInfo }}</view>
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
      </view>
    </scroll-view>

    <EmptyState v-else icon="♪" title="曲谱加载中" desc="正在准备谱面" />

    <view v-if="song" class="bottom-action-bar">
      <view class="practice-btn" @tap="startPractice">
        <text class="play-icon">▶</text>
        <text>{{ isImageReader ? '开始读谱' : '开始练习' }}</text>
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
import { useAuthStore } from '../../stores/auth'
import type { Song, SongSection } from '../../types'

interface ImageTabBlock { type?: 'section' | 'tab'; text?: string; lines?: string[] }
interface ImageTabPage { title?: string; blocks: ImageTabBlock[] }

const song = ref<Song | null>(null)
const transposeOffset = ref(0)
const readerMode = ref<'auto' | 'image' | 'txt'>('auto')

const SHARP_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const FLAT_TO_SHARP: Record<string, string> = { 'Db': 'C#', 'D♭': 'C#', 'Eb': 'Eb', 'E♭': 'Eb', 'Gb': 'F#', 'G♭': 'F#', 'Ab': 'Ab', 'A♭': 'Ab', 'Bb': 'Bb', 'B♭': 'Bb' }
const CHORD_RE = /^([A-G](?:#|b|♭)?)(.*)$/
const CHORD_TOKEN_RE = /([A-G](?:#|b|♭)?(?:m|maj|min|dim|aug|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:\/[A-G](?:#|b|♭)?)?)/g

const displayTitle = computed(() => {
  const title = song.value?.title || '练习曲谱'
  return title.startsWith('《') ? title : `《${title}》`
})
const originalKey = computed(() => normalizeNoteName(String(song.value?.song_key || 'C').replace(/调/g, '')) || 'C')
const displayKey = computed(() => transposeNote(originalKey.value, transposeOffset.value))
const imageTabPages = computed<ImageTabPage[]>(() => {
  const pages = song.value?.content_json?.imageTabPages
  return Array.isArray(pages) ? pages.filter((page) => Array.isArray(page?.blocks)) : []
})
const hasImageTabPages = computed(() => imageTabPages.value.length > 0)
const isDualTab = computed(() => song.value?.content_json?.tabOutputType === 'both' || song.value?.source_type === 'ai_web_dual_tab' || song.value?.source_type === 'ai_dual_tab')
const isImageReader = computed(() => {
  if (!hasImageTabPages.value) return false
  if (readerMode.value === 'image') return true
  if (readerMode.value === 'txt') return false
  return false
})
const sourceLabel = computed(() => {
  if (isDualTab.value) return 'AI完整曲谱'
  if (song.value?.source_type === 'web_txt') return '文本谱导入'
  if (song.value?.source_type === 'ai_web_image_tab' || song.value?.source_type === 'ai_image_tab') return 'AI图片六线谱'
  if (song.value?.source_type === 'ai_web_txt') return 'AI生成TXT谱'
  if (song.value?.source_type === 'ai_web') return 'AI编配'
  if (song.value?.source_type === 'ai') return 'AI原创'
  if (song.value?.source_type === 'seed' || song.value?.source_type === 'seed_bulk') return '歌曲索引'
  return '练习曲谱'
})
const arrangerLabel = computed(() => String(song.value?.source_type || '').startsWith('ai') ? '谱灵 AI 编配' : song.value?.artist_name || '曲谱资源')
const baseSections = computed<SongSection[]>(() => {
  const content = song.value?.content_json
  if (content?.sections?.length) return content.sections
  return [{ name: '主歌', lines: [{ chordLine: '| C | G | Am | F |', lyricLine: '这里会显示弹唱练习谱' }] }]
})
const transposedSections = computed<SongSection[]>(() => {
  if (!transposeOffset.value) return baseSections.value
  return baseSections.value.map(section => ({ ...section, lines: section.lines.map(line => ({ ...line, chordLine: transposeChordLine(line.chordLine || '', transposeOffset.value) })) }))
})
const practiceTips = computed<string[]>(() => {
  const tips = song.value?.content_json?.practiceTips
  if (tips?.length) return tips
  return ['先用 80 BPM 慢速练习主歌', '注意换和弦时手型提前准备', '适合新手从简单扫弦开始']
})
const sourceInfo = computed(() => song.value?.content_json?.copyrightNotice || '')

onLoad(async (query) => {
  const id = String(query?.id || '')
  if (id) song.value = await getSongDetail(id)
})

function setReaderMode(mode: 'image' | 'txt') { readerMode.value = mode }
function normalizeTabLines(lines?: string[]) { return Array.isArray(lines) ? lines.filter(Boolean) : [] }
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
function transposeChordToken(token = '', offset = 0) {
  const slashParts = token.split('/')
  const main = transposeChordRoot(slashParts[0], offset)
  if (slashParts.length === 1) return main
  return `${main}/${transposeChordRoot(slashParts[1], offset)}`
}
function transposeChordRoot(part = '', offset = 0) {
  const match = part.match(CHORD_RE)
  if (!match) return part
  return `${transposeNote(match[1], offset)}${match[2] || ''}`
}
function transposeChordLine(line = '', offset = 0) { return line.replace(CHORD_TOKEN_RE, (match) => transposeChordToken(match, offset)) }
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
function goBack() { uni.navigateBack() }
function startPractice() {
  if (!song.value) return
  if (isImageReader.value) { uni.showToast({ title: '已进入图片六线谱阅读', icon: 'none' }); return }
  uni.navigateTo({ url: `/pages/practice/index?id=${song.value.id}&transpose=${transposeOffset.value}` })
}
function transposeUp() {
  if (isImageReader.value) { uni.showToast({ title: '图片谱请切换到TXT谱后转调', icon: 'none' }); return }
  transposeOffset.value += 1
  uni.showToast({ title: `已升调至 ${displayKey.value}`, icon: 'none' })
}
function transposeDown() {
  if (isImageReader.value) { uni.showToast({ title: '图片谱请切换到TXT谱后转调', icon: 'none' }); return }
  transposeOffset.value -= 1
  uni.showToast({ title: `已降调至 ${displayKey.value}`, icon: 'none' })
}
function resetTranspose() { transposeOffset.value = 0 }
function openMetronome() { uni.showToast({ title: '节拍器即将开放', icon: 'none' }) }
</script>

<style scoped lang="scss">
.detail-page { width: 750rpx; min-height: 100vh; background: #F7FAF8; color: #17231E; box-sizing: border-box; }
.top-safe { padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 0; box-sizing: border-box; }
.back-btn { width: 88rpx; height: 88rpx; color: #17231E; font-size: 72rpx; line-height: 76rpx; font-weight: 300; }
.page-scroll { height: calc(100vh - 112rpx); }
.content-wrap { padding: 42rpx 32rpx 190rpx; box-sizing: border-box; }
.card { width: 686rpx; box-sizing: border-box; background: #FFFFFF; border: 1rpx solid rgba(232, 239, 234, 0.9); box-shadow: 0 16rpx 42rpx rgba(18, 52, 36, 0.06); }
.song-info-card { padding: 38rpx 32rpx 28rpx; border-radius: 36rpx; }
.title-row { display: flex; align-items: flex-start; justify-content: space-between; }
.title-main { flex: 1; min-width: 0; }
.song-title { color: #17231E; font-size: 43rpx; line-height: 56rpx; font-weight: 900; letter-spacing: -1rpx; }
.song-subtitle { margin-top: 18rpx; color: #6B756F; font-size: 25rpx; line-height: 34rpx; font-weight: 500; }
.author-row { margin-top: 34rpx; display: flex; align-items: center; }
.author-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: #10B15A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 900; margin-right: 16rpx; box-shadow: 0 10rpx 24rpx rgba(16, 177, 90, 0.22); }
.author-info { flex: 1; min-width: 0; }
.author-name { color: #17231E; font-size: 27rpx; line-height: 34rpx; font-weight: 800; }
.author-desc { margin-top: 4rpx; color: #8A9490; font-size: 23rpx; line-height: 30rpx; }
.favorite-btn { height: 70rpx; min-width: 136rpx; padding: 0 24rpx; border-radius: 999rpx; border: 1rpx solid #DCEFE6; color: #10B15A; background: #FFFFFF; display: flex; align-items: center; justify-content: center; gap: 10rpx; font-size: 26rpx; line-height: 34rpx; font-weight: 800; }
.heart { font-size: 35rpx; line-height: 35rpx; }
.param-grid { margin-top: 34rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18rpx; }
.param-item { height: 112rpx; border-radius: 22rpx; background: #F6FAF8; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.param-label { color: #6B756F; font-size: 24rpx; line-height: 30rpx; }
.param-value { margin-top: 12rpx; color: #0C7A42; font-size: 34rpx; line-height: 40rpx; font-weight: 900; }
.reader-switch { margin-top: 24rpx; height: 82rpx; padding: 10rpx; border-radius: 28rpx; display: flex; gap: 10rpx; }
.switch-item { flex: 1; border-radius: 20rpx; color: #6B756F; background: #F6FAF8; display: flex; align-items: center; justify-content: center; font-size: 25rpx; font-weight: 900; }
.switch-item.active { color: #FFFFFF; background: #17231E; }
.tool-card { margin-top: 30rpx; height: 114rpx; padding: 18rpx 20rpx; border-radius: 28rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18rpx; }
.tool-btn { height: 76rpx; border-radius: 18rpx; border: 1rpx solid #E3EBE7; background: #FFFFFF; color: #17231E; display: flex; align-items: center; justify-content: center; gap: 10rpx; font-size: 25rpx; font-weight: 800; }
.tool-btn.active { color: #0C9D50; background: #EAF8F0; border-color: #D8F0E4; }
.tool-icon { color: #10B15A; font-size: 36rpx; line-height: 36rpx; font-weight: 900; }
.transpose-card { width: 686rpx; margin-top: 22rpx; padding: 18rpx 24rpx; box-sizing: border-box; border-radius: 22rpx; background: #FFF8E8; color: #9A6714; font-size: 24rpx; line-height: 34rpx; }
.reset-link { margin-left: 18rpx; color: #0BA45A; font-weight: 900; }
.image-reader-card { width: 686rpx; margin-top: 30rpx; }
.reader-head { padding: 26rpx 28rpx; border-radius: 28rpx; background: #17231E; color: #FFFFFF; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 18rpx 38rpx rgba(23, 35, 30, .12); }
.reader-title { font-size: 31rpx; line-height: 40rpx; font-weight: 900; }
.reader-desc { margin-top: 6rpx; color: rgba(255,255,255,.72); font-size: 22rpx; line-height: 30rpx; }
.page-count { height: 50rpx; padding: 0 18rpx; border-radius: 999rpx; background: rgba(255,255,255,.12); display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 900; }
.tab-page { margin-top: 24rpx; padding: 30rpx 24rpx 34rpx; border-radius: 26rpx; background: #FFFDF8; border: 1rpx solid #EFE7D8; box-shadow: 0 16rpx 42rpx rgba(92, 63, 21, 0.08); }
.paper-head { padding-bottom: 20rpx; margin-bottom: 22rpx; border-bottom: 1rpx solid #E8DEC8; }
.paper-title { color: #17231E; font-size: 30rpx; line-height: 38rpx; font-weight: 900; }
.paper-meta { margin-top: 8rpx; color: #8B7657; font-size: 22rpx; line-height: 30rpx; }
.tab-block + .tab-block { margin-top: 26rpx; }
.tab-section-title { display: inline-flex; padding: 8rpx 16rpx; border-radius: 999rpx; background: #17231E; color: #FFFFFF; font-size: 22rpx; line-height: 30rpx; font-weight: 900; }
.six-line-wrap { padding: 18rpx 16rpx; border-radius: 18rpx; background: #FFFFFF; border: 1rpx solid #EEE5D4; overflow-x: auto; }
.six-line { display: block; color: #17231E; font-size: 22rpx; line-height: 32rpx; font-weight: 700; font-family: 'Courier New', monospace; white-space: pre; }
.six-line:nth-last-child(-n + 2) { color: #0BA45A; font-weight: 900; }
.sheet-card { margin-top: 30rpx; padding: 36rpx 32rpx; border-radius: 30rpx; }
.sheet-section + .sheet-section { margin-top: 46rpx; padding-top: 44rpx; border-top: 1rpx dashed #D9E2DD; }
.section-title-row { display: flex; align-items: center; margin-bottom: 30rpx; }
.section-mark { width: 8rpx; height: 34rpx; border-radius: 999rpx; background: #10B15A; margin-right: 16rpx; }
.section-name { color: #17231E; font-size: 32rpx; line-height: 40rpx; font-weight: 900; }
.sheet-line + .sheet-line { margin-top: 34rpx; }
.chord-line { color: #10B15A; font-size: 32rpx; line-height: 40rpx; font-weight: 900; font-family: 'Courier New', monospace; white-space: pre-wrap; }
.chord-token { color: #0BA45A; background: rgba(11, 164, 90, 0.08); border-radius: 8rpx; padding: 0 4rpx; }
.chord-space { color: transparent; white-space: pre-wrap; }
.lyric-line { margin-top: 12rpx; color: #17231E; font-size: 32rpx; line-height: 48rpx; font-weight: 500; }
.source-card { width: 686rpx; margin-top: 30rpx; padding: 24rpx 28rpx; box-sizing: border-box; border-radius: 26rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; }
.source-title { color: #17231E; font-size: 27rpx; line-height: 34rpx; font-weight: 900; }
.source-text { margin-top: 8rpx; color: #7B8580; font-size: 23rpx; line-height: 34rpx; word-break: break-all; }
.practice-card { width: 686rpx; margin-top: 30rpx; padding: 32rpx 34rpx; box-sizing: border-box; border-radius: 30rpx; background: linear-gradient(135deg, #EAF8F0 0%, #F3FCF7 100%); border: 1rpx solid #CDEEDC; }
.tips-head { display: flex; align-items: center; }
.tips-icon { width: 64rpx; height: 64rpx; border-radius: 50%; background: #10B15A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 900; margin-right: 18rpx; }
.tips-title { color: #17231E; font-size: 32rpx; line-height: 42rpx; font-weight: 900; }
.tips-list { margin-top: 24rpx; }
.tip-item { display: flex; align-items: flex-start; gap: 18rpx; margin-top: 14rpx; }
.tip-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #10B15A; margin-top: 16rpx; flex-shrink: 0; }
.tip-text { color: #17231E; font-size: 27rpx; line-height: 42rpx; }
.bottom-action-bar { position: fixed; left: 0; right: 0; bottom: 0; width: 750rpx; min-height: 142rpx; padding: 22rpx 32rpx calc(env(safe-area-inset-bottom) + 16rpx); box-sizing: border-box; background: rgba(255, 255, 255, 0.94); border-top: 1rpx solid #E8EFEA; z-index: 20; }
.practice-btn { width: 686rpx; height: 88rpx; border-radius: 28rpx; background: #10B15A; color: #FFFFFF; box-shadow: 0 14rpx 32rpx rgba(16, 177, 90, 0.22); display: flex; align-items: center; justify-content: center; gap: 16rpx; font-size: 30rpx; line-height: 38rpx; font-weight: 900; }
.play-icon { font-size: 34rpx; font-weight: 900; }
</style>