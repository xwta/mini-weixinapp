<template>
  <view class="page">
    <scroll-view class="content" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view class="hero">
        <view class="hero-title">谱灵 AI</view>
        <view class="hero-desc">输入歌曲名，命中可靠曲谱结构后生成可练习完整谱。</view>
      </view>

      <view class="mode-grid">
        <view class="mode-card active" @tap="selectMode('search')">
          <view class="mode-icon">⌕</view>
          <view class="mode-title">搜谱</view>
          <view class="mode-desc">先校验，再生成双谱</view>
        </view>
        <view class="mode-card" @tap="selectMode('practice')">
          <view class="mode-icon">▶</view>
          <view class="mode-title">练习</view>
          <view class="mode-desc">生成后开始练习</view>
        </view>
        <view class="mode-card" @tap="selectMode('chord')">
          <view class="mode-icon">♬</view>
          <view class="mode-title">配和弦</view>
          <view class="mode-desc">输入文本匹配和弦</view>
        </view>
        <view class="mode-card" @tap="selectMode('song')">
          <view class="mode-icon">♪</view>
          <view class="mode-title">AI写歌</view>
          <view class="mode-desc">灵感创作</view>
        </view>
      </view>

      <view class="chat-area">
        <ChatBubble
          v-for="message in messages"
          :key="message.id"
          :role="message.role"
          :content="message.content"
          @selectPrompt="fillPrompt"
          @start="focusInput"
        />

        <view v-if="loading" class="typing-row">
          <view class="typing-avatar">谱</view>
          <view class="typing-bubble">
            <view class="typing-dot" />
            <view class="typing-dot" />
            <view class="typing-dot" />
          </view>
        </view>

        <AiResultCard
          v-if="lastResult"
          :title="lastResult.title"
          :chords="lastResult.chords"
          @view="openSong(lastResult.songId)"
          @practice="startPractice(lastResult.songId)"
          @save="saveResult"
        />
      </view>
    </scroll-view>

    <view class="input-bar">
      <view class="voice-btn" @tap="showToolTip('语音')">录</view>
      <view class="input-shell">
        <input
          v-model="inputText"
          class="chat-input"
          confirm-type="send"
          :disabled="loading"
          :focus="inputFocus"
          :placeholder="loading ? '正在检查曲谱结构...' : placeholder"
          @confirm="sendMessage"
          @blur="inputFocus = false"
        />
      </view>
      <view :class="['send-btn', loading && 'loading']" @tap="sendMessage">{{ loading ? '处理中' : '发送' }}</view>
    </view>

    <AppBottomTab active="chat" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ChatBubble from '@/components/home/ChatBubble.vue'
import AiResultCard from '@/components/home/AiResultCard.vue'
import AppBottomTab from '@/components/home/AppBottomTab.vue'
import { loginWithWechatProfile } from '@/api/auth'
import { createChords, createSongwriting, createWebChords } from '@/api/ai'
import { searchSongs } from '@/api/songs'
import { testSongProfile } from '@/api/songProfiles'
import { useAuthStore } from '@/stores/auth'
import { saveRecentSearch } from '@/utils/recent'
import type { AiSongResult, Song } from '@/types'
import type { WebSongCandidate } from '@/api/webSearch'
import type { SongProfilePreview } from '@/api/songProfiles'

interface ChatMessage { id: string; role: 'ai' | 'user'; content: string }
interface ResultCardState { songId: string | number; title: string; chords: string }
type ModeValue = 'search' | 'song' | 'chord' | 'practice'

const inputText = ref('')
const activeMode = ref<ModeValue>('search')
const loading = ref(false)
const scrollTop = ref(0)
const inputFocus = ref(false)
const placeholder = ref('输入歌名，生成可靠吉他谱')
const lastResult = ref<ResultCardState | null>(null)

const messages = ref<ChatMessage[]>([
  { id: 'welcome', role: 'ai', content: '直接输入歌曲名，我会先检查是否收录可靠曲谱结构；命中后再生成 TXT 弹唱谱和图片六线谱，未命中不会强行生成错谱。' },
])

onLoad((query) => {
  const keyword = decodeURIComponent(String(query?.keyword || '')).trim()
  if (!keyword) return
  inputText.value = keyword
  setTimeout(() => sendMessage(), 400)
})

function selectMode(value: string) {
  activeMode.value = value as ModeValue
  placeholder.value = value === 'search' ? '输入歌名，生成可靠吉他谱' : value === 'practice' ? '输入歌名，生成后开始练习' : value === 'chord' ? '输入文本，智能匹配和弦' : '输入一句灵感开始创作'
  inputFocus.value = true
}

function fillPrompt(prompt: string) { inputText.value = prompt; inputFocus.value = true }
function focusInput() { activeMode.value = 'search'; inputFocus.value = true }
function showToolTip(name: string) { uni.showToast({ title: `${name}功能即将开放`, icon: 'none' }) }
function delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }

function pushMessage(role: 'ai' | 'user', content: string) {
  messages.value.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, role, content })
  nextTick(() => { scrollTop.value += 360 })
}

async function streamAiMessage(content: string) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  messages.value.push({ id, role: 'ai', content: '' })
  for (let index = 0; index < content.length; index += 2) {
    const target = messages.value.find(item => item.id === id)
    if (!target) return
    target.content = content.slice(0, index + 2)
    if (index % 8 === 0) nextTick(() => { scrollTop.value += 120 })
    await delay(12)
  }
  const target = messages.value.find(item => item.id === id)
  if (target) target.content = content
  nextTick(() => { scrollTop.value += 360 })
}

function normalizeSearchText(text = '') {
  return String(text || '').replace(/[《》【】\[\]（）()]/g, ' ').replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|完整版|原版|简单版|新手版|教学|指弹|尤克里里/g, ' ').replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ').trim()
}
function compactSearchText(text = '') { return normalizeSearchText(text).replace(/\s+/g, '').toLowerCase() }
function getSongArtist(song: Song | any) { return String(song?.artist_name || song?.author_name || song?.artist || '').trim() }
function getSongSearchFields(song: Song | any) { return [song.title, song.artist_name, song.author_name, song.pinyin, song.initials, ...(Array.isArray(song.aliases) ? song.aliases : [])].filter(Boolean) }
function isReliableLocalSong(song: Song | any, keywordText: string) {
  const compactKeyword = compactSearchText(keywordText)
  const fields = getSongSearchFields(song).map(compactSearchText).join(' ')
  return Boolean(compactKeyword && fields.includes(compactKeyword))
}
function getReliableLocalSongs(items: any[] = [], keywordText: string) { return items.filter((item) => isReliableLocalSong(item, keywordText)) }
function normalizeChords(result: AiSongResult) { return result.chords?.length ? result.chords.join(' · ') : `${result.key || 'C'}调 · ${result.difficulty || '新手'}` }

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

async function tryFindLocalSong(text: string) {
  try {
    const local = await searchSongs({ keyword: text, page_size: 5 })
    const reliableItems = getReliableLocalSongs(local.items || [], text)
    return reliableItems[0]
  } catch (error) {
    console.log('local song lookup skipped', error)
    return undefined
  }
}

function createCandidateFromProfile(profile: SongProfilePreview, fallbackText: string, localSong?: Song | any): WebSongCandidate {
  return {
    title: profile.title || localSong?.title || normalizeSearchText(fallbackText) || fallbackText,
    artist: profile.artist || getSongArtist(localSong),
    album: localSong?.album || '',
    confidence: 0.98,
    source: profile.source || 'verified_profile',
    summary: `已命中可靠曲谱结构：${profile.key}调 · ${profile.capo} · ${profile.bpm} BPM。`,
    references: [],
    tabReferences: [],
    preferred_output_type: 'both',
    arrangementHints: {
      outputPreference: 'both',
      difficulty: '新手',
      possibleKeys: [profile.key].filter(Boolean),
      possibleCapos: [profile.capo].filter(Boolean),
      possibleChords: profile.chords || [],
      tabReferenceCount: 0,
      imageReferenceCount: 0,
      textReferenceCount: 0,
      viewOnlyCount: 0,
    },
  }
}

function isProfileMissingMessage(message = '') {
  return /暂未收录|暂未匹配|可靠曲谱结构|避免生成错谱/i.test(message)
}

async function precheckSongProfile(text: string) {
  const result = await testSongProfile(text)
  if (!result.matched || !result.profile) return result
  return result
}

async function generateFullTabFromSongText(text: string, localSong?: Song | any) {
  await streamAiMessage(`正在检查《${normalizeSearchText(text) || text}》是否收录可靠曲谱结构。`)
  const profileCheck = await precheckSongProfile(text)
  if (!profileCheck.matched || !profileCheck.profile) {
    await streamAiMessage(`${profileCheck.message || `暂未收录《${normalizeSearchText(text) || text}》的可靠曲谱结构。`}\n\n为了避免生成不符合真实歌曲的错谱，暂不自动生成。你可以试试：成都、晴天、海阔天空、平凡之路、半壶纱。`)
    return
  }

  const profile = profileCheck.profile
  await ensureLogin()
  const candidate = createCandidateFromProfile(profile, text, localSong)
  await streamAiMessage(`已命中《${profile.title}》${profile.artist ? ` - ${profile.artist}` : ''} 的可靠结构：${profile.key}调 · ${profile.capo} · ${profile.bpm} BPM。正在生成完整曲谱。`)
  try {
    const result = await createWebChords({ title: candidate.title, artist: candidate.artist, key: profile.key || 'C', difficulty: '新手', web_context: candidate, output_type: 'both' })
    if (!result.songId) { await streamAiMessage('曲谱已生成，但未返回曲谱编号。请稍后重试。'); return }
    await streamAiMessage(`已生成《${result.title}》。包含 TXT 弹唱谱和图片六线谱，正在打开详情页。`)
    lastResult.value = { songId: result.songId, title: result.title, chords: `${normalizeChords(result)} · 可练习完整曲谱` }
    setTimeout(() => openSong(result.songId), 520)
  } catch (error: any) {
    const message = error?.message || ''
    if (isProfileMissingMessage(message)) {
      await streamAiMessage(`${message}\n\n已停止生成，避免输出不符合真实歌曲的错谱。`)
      return
    }
    throw error
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || loading.value) return
  inputText.value = ''
  lastResult.value = null
  pushMessage('user', text)
  loading.value = true
  try {
    if (activeMode.value === 'search' || activeMode.value === 'practice') {
      saveRecentSearch(text)
      const localSong = await tryFindLocalSong(text)
      await generateFullTabFromSongText(text, localSong)
      return
    }
    await ensureLogin()
    const result = activeMode.value === 'chord'
      ? await createChords({ lyrics: text, key: 'C', difficulty: '新手', rhythm: 'auto' })
      : await createSongwriting({ prompt: text, style: '民谣', difficulty: '新手', key: 'C', language: '中文' })
    if (!result.songId) { await streamAiMessage('生成已完成，但未返回曲谱编号。请稍后重试。'); return }
    await streamAiMessage(`已生成《${result.title}》。和弦走向：${normalizeChords(result)}。`)
    lastResult.value = { songId: result.songId, title: result.title, chords: normalizeChords(result) }
  } catch (error: any) {
    await streamAiMessage(error?.message || '曲谱生成暂时不可用，请稍后再试。')
  } finally {
    loading.value = false
  }
}

function openSong(songId?: string | number) { if (songId) uni.navigateTo({ url: `/pages/song-detail/index?id=${songId}` }) }
function startPractice(songId?: string | number) { if (songId) uni.navigateTo({ url: `/pages/practice/index?id=${songId}` }) }
function saveResult() { uni.showToast({ title: '已保存到我的作品', icon: 'success' }) }
function handleTabChange(value: string) { if (value === 'chat') return; if (value === 'tuner') uni.reLaunch({ url: '/pages/community/index' }); if (value === 'mine') uni.reLaunch({ url: '/pages/mine/index' }) }
</script>

<style scoped>
.page { --page-bg: #F6FBF8; --card-bg: rgba(255, 255, 255, 0.96); --line-soft: #E8EFEA; --text-main: #17231E; --brand: #0BA45A; min-height: 100vh; width: 750rpx; background: var(--page-bg); padding-bottom: 244rpx; box-sizing: border-box; }
.content { height: calc(100vh - 244rpx); box-sizing: border-box; }
.hero { width: 686rpx; margin: calc(env(safe-area-inset-top) + 76rpx) 32rpx 0; padding: 34rpx; box-sizing: border-box; border-radius: 32rpx; background: #FFFFFF; border: 1rpx solid var(--line-soft); box-shadow: 0 12rpx 34rpx rgba(18,52,36,.06); }
.hero-title { color: var(--text-main); font-size: 42rpx; line-height: 52rpx; font-weight: 900; }
.hero-desc { margin-top: 12rpx; color: #6B756F; font-size: 25rpx; line-height: 36rpx; }
.mode-grid { width: 686rpx; margin: 28rpx 32rpx 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; }
.mode-card { height: 158rpx; padding: 22rpx; box-sizing: border-box; border-radius: 28rpx; background: #FFFFFF; border: 1rpx solid var(--line-soft); }
.mode-card.active { background: #EAF8F0; border-color: #CDEEDC; }
.mode-icon { color: var(--brand); font-size: 34rpx; font-weight: 900; }
.mode-title { margin-top: 10rpx; color: var(--text-main); font-size: 27rpx; font-weight: 900; }
.mode-desc { margin-top: 6rpx; color: #7B8580; font-size: 21rpx; }
.chat-area { margin-top: 42rpx; padding-bottom: 36rpx; }
.typing-row { width: 750rpx; padding: 0 32rpx; margin-bottom: 24rpx; display: flex; align-items: flex-start; box-sizing: border-box; }
.typing-avatar { width: 72rpx; height: 72rpx; margin-right: 20rpx; border-radius: 999rpx; background: var(--brand); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 800; }
.typing-bubble { height: 64rpx; padding: 0 28rpx; border-radius: 999rpx; background: var(--card-bg); border: 1rpx solid var(--line-soft); display: flex; align-items: center; gap: 10rpx; }
.typing-dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: var(--brand); animation: typing 0.9s infinite ease-in-out; }
.typing-dot:nth-child(2) { animation-delay: .12s; }
.typing-dot:nth-child(3) { animation-delay: .24s; }
.input-bar { position: fixed; left: 0; right: 0; bottom: 132rpx; width: 750rpx; padding: 14rpx 32rpx 16rpx; box-sizing: border-box; background: var(--page-bg); display: flex; align-items: center; gap: 14rpx; z-index: 18; }
.voice-btn { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: #FFFFFF; border: 1rpx solid var(--line-soft); color: var(--brand); display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 900; flex-shrink: 0; }
.input-shell { flex: 1; height: 72rpx; min-width: 0; border-radius: 999rpx; background: #FFFFFF; border: 1rpx solid var(--line-soft); display: flex; align-items: center; box-sizing: border-box; overflow: hidden; }
.chat-input { flex: 1; min-width: 0; height: 72rpx; padding: 0 26rpx; box-sizing: border-box; font-size: 26rpx; color: var(--text-main); }
.send-btn { width: 112rpx; height: 72rpx; border-radius: 999rpx; background: var(--brand); color: #FFFFFF; font-size: 26rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.send-btn.loading { opacity: .72; }
@keyframes typing { 0%, 80%, 100% { opacity: .34; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-5rpx); } }
</style>