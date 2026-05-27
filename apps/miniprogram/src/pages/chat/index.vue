<template>
  <view class="page" :class="{ 'page--leaving': pageLeaving }">
    <scroll-view class="content" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view v-if="booting" class="skeleton-page">
        <view class="skeleton-hero skeleton-block" />
        <view class="skeleton-grid">
          <view v-for="item in 4" :key="item" class="skeleton-card skeleton-block" />
        </view>
        <view class="skeleton-chat">
          <view class="skeleton-avatar skeleton-block" />
          <view class="skeleton-bubble skeleton-block" />
        </view>
      </view>

      <view v-else class="page-content">
        <HomeHero @openRecord="openRecord" />
        <view class="section-space" />
        <HomeModeGrid :items="modeItems" @select="selectMode" />

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

          <WebSongSearchResultsCard
            v-if="webCandidates.length && !webCandidate"
            :candidates="webCandidates"
            :source-label="webResultLabel"
            @select="selectWebCandidate"
            @searchAgain="refreshLastSearch"
          />

          <WebSongSuggestionCard
            v-if="webCandidate"
            :candidate="webCandidate"
            :loading="webGenerating"
            @generate="generateFromWebCandidate"
            @back="backToSearchResults"
          />

          <AiResultCard
            v-if="lastResult"
            :title="lastResult.title"
            :chords="lastResult.chords"
            @view="openSong(lastResult.songId)"
            @practice="startPractice(lastResult.songId)"
            @save="saveResult"
          />
        </view>
      </view>
    </scroll-view>

    <view class="input-bar">
      <view class="voice-btn" @tap="fillVoiceHint">🎙</view>
      <view class="input-shell">
        <input
          v-model="inputText"
          class="chat-input"
          confirm-type="send"
          :disabled="loading || webGenerating"
          :focus="inputFocus"
          :placeholder="loading || webGenerating ? '谱灵正在生成完整曲谱...' : placeholder"
          @confirm="sendMessage"
          @blur="inputFocus = false"
        />
        <view class="tool-btn" @tap="showToolTip('附件')">📎</view>
        <view class="tool-btn music-tool" @tap="selectMode('chord')">♪</view>
      </view>
      <view :class="['send-btn', (loading || webGenerating) && 'loading']" @tap="sendMessage">{{ loading || webGenerating ? '处理中' : '发送' }}</view>
    </view>

    <AppBottomTab active="chat" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import HomeHero from '@/components/home/HomeHero.vue'
import HomeModeGrid from '@/components/home/HomeModeGrid.vue'
import ChatBubble from '@/components/home/ChatBubble.vue'
import AiResultCard from '@/components/home/AiResultCard.vue'
import WebSongSearchResultsCard from '@/components/home/WebSongSearchResultsCard.vue'
import WebSongSuggestionCard from '@/components/home/WebSongSuggestionCard.vue'
import AppBottomTab from '@/components/home/AppBottomTab.vue'
import { loginWithWechatProfile } from '@/api/auth'
import { createChords, createSongwriting, createWebChords, type TabOutputType } from '@/api/ai'
import { searchSongs } from '@/api/songs'
import { searchWebSong, searchWebTabs } from '@/api/webSearch'
import { useAuthStore } from '@/stores/auth'
import { saveRecentSearch } from '@/utils/recent'
import type { AiSongResult, Song } from '@/types'
import type { WebSongCandidate } from '@/api/webSearch'

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  content: string
}

interface ResultCardState {
  songId: string | number
  title: string
  chords: string
}

type ModeValue = 'search' | 'song' | 'chord' | 'practice'

const inputText = ref('')
const activeMode = ref<ModeValue>('search')
const loading = ref(false)
const booting = ref(true)
const pageLeaving = ref(false)
const scrollTop = ref(0)
const inputFocus = ref(false)
const placeholder = ref('输入歌名搜索吉他谱')
const lastResult = ref<ResultCardState | null>(null)
const webCandidates = ref<WebSongCandidate[]>([])
const webCandidate = ref<WebSongCandidate | null>(null)
const webResultLabel = ref('曲谱搜索结果')
const webGenerating = ref(false)
const lastSearchText = ref('')

const messages = ref<ChatMessage[]>([
  {
    id: 'welcome',
    role: 'ai',
    content: '欢迎使用谱灵 AI。直接输入歌名即可搜谱，确认后会同时生成 TXT 弹唱谱和图片六线谱。',
  },
])

const modeItems = [
  { icon: '⌕', label: '搜谱', value: 'search', badge: '默认', desc: '输入歌名生成完整曲谱', statusIcon: '🔥', statusText: 'AI搜谱' },
  { icon: '▶', label: '练习', value: 'practice', badge: '今日', desc: '打开曲谱开始练习', statusIcon: '◷', statusText: '12 分钟' },
  { icon: '♬', label: '配和弦', value: 'chord', badge: '智能', desc: '为歌词智能匹配和弦', statusIcon: '♬', statusText: 'C G Am F' },
  { icon: '♪', label: 'AI写歌', value: 'song', badge: '创作', desc: '输入灵感，生成歌词与和弦', statusIcon: '♫', statusText: '快速生成' },
]

onLoad((query) => {
  const keyword = decodeURIComponent(String(query?.keyword || '')).trim()
  if (!keyword) return
  activeMode.value = 'search'
  inputText.value = keyword
  setTimeout(() => {
    sendMessage()
  }, 620)
})

onMounted(() => {
  setTimeout(() => {
    booting.value = false
  }, 360)
})

function selectMode(value: string) {
  activeMode.value = value as ModeValue
  const prompts: Record<ModeValue, string> = {
    search: '输入歌名搜索吉他谱',
    practice: '输入歌名，打开曲谱开始练习',
    chord: '粘贴歌词，智能匹配和弦',
    song: '输入一句灵感，生成歌词与和弦',
  }
  placeholder.value = prompts[activeMode.value]
  inputFocus.value = true
}

function fillPrompt(prompt: string) {
  inputText.value = prompt
  activeMode.value = detectRoute(prompt)
  inputFocus.value = true
}

function focusInput() {
  activeMode.value = 'search'
  placeholder.value = '输入歌名继续搜索'
  inputFocus.value = true
}

function showToolTip(name: string) {
  uni.showToast({ title: `${name}功能即将开放`, icon: 'none' })
}

function fillVoiceHint() {
  uni.showToast({ title: '语音输入即将开放', icon: 'none' })
}

function pushMessage(role: 'ai' | 'user', content: string) {
  messages.value.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  })
  nextTick(() => {
    scrollTop.value += 360
  })
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function streamAiMessage(content: string) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  messages.value.push({ id, role: 'ai', content: '' })
  for (let index = 0; index < content.length; index += 2) {
    const target = messages.value.find(item => item.id === id)
    if (!target) return
    target.content = content.slice(0, index + 2)
    if (index % 8 === 0) nextTick(() => { scrollTop.value += 120 })
    await delay(18)
  }
  const target = messages.value.find(item => item.id === id)
  if (target) target.content = content
  nextTick(() => { scrollTop.value += 360 })
}

function normalizeSearchText(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[《》【】\[\]（）()]/g, ' ')
    .replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|歌词|歌曲|简谱|完整版|原版|c调|g调|d调|a调|e调|f调|b调|新手|简单版|教学|指弹|尤克里里/g, ' ')
    .replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ')
    .trim()
}

function compactSearchText(text = '') {
  return normalizeSearchText(text).replace(/\s+/g, '')
}

function isTabSearchIntent(text = '') {
  return /吉他谱|曲谱|谱子|弹唱谱|和弦谱|六线谱|gtp|guitar\s*tab|guitar\s*chords?|\bchords?\b|\btabs?\b/i.test(text)
}

function isCreationIntent(text = '') {
  return /写一首|生成|创作|编一首|歌词|风格|民谣|摇滚|情歌|rap|说唱|旋律|作词|作曲/.test(text)
}

function getSongSearchFields(song: Song | any) {
  return [
    song.title,
    song.artist_name,
    song.author_name,
    song.pinyin,
    song.initials,
    song.search_fingerprint,
    ...(Array.isArray(song.aliases) ? song.aliases : []),
    ...(Array.isArray(song.search_keywords) ? song.search_keywords : []),
    ...(Array.isArray(song.tags) ? song.tags : []),
  ].filter(Boolean)
}

function isReliableLocalSong(song: Song | any, keywordText: string) {
  const keyword = normalizeSearchText(keywordText)
  const compactKeyword = compactSearchText(keywordText)
  if (!keyword) return true
  const title = normalizeSearchText(song.title)
  const compactTitle = compactSearchText(song.title)
  const fields = getSongSearchFields(song)
  const haystack = fields.map(normalizeSearchText).join(' ')
  const compactHaystack = fields.map(compactSearchText).join(' ')
  const tokens = keyword.split(' ').filter((token) => token.length >= 2)
  if (title && (title === keyword || title.includes(keyword) || keyword.includes(title))) return true
  if (compactTitle && compactKeyword && (compactTitle === compactKeyword || compactTitle.includes(compactKeyword) || compactKeyword.includes(compactTitle))) return true
  if (compactHaystack.includes(compactKeyword) && compactKeyword.length >= 2) return true
  if (tokens.length && tokens.every((token) => haystack.includes(token))) return true
  return false
}

function getReliableLocalSongs(items: any[] = [], keywordText: string) {
  return items.filter((item) => isReliableLocalSong(item, keywordText))
}

function isSeedOnlySong(song: Song | any) {
  return song?.has_tab === false || song?.source_type === 'seed' || song?.source_type === 'seed_bulk'
}

function getSongArtist(song: Song | any) {
  return String(song?.artist_name || song?.author_name || song?.artist || '').trim()
}

function buildSongAwareSearchText(song: Song | any, fallbackText: string) {
  const title = String(song?.title || fallbackText || '').trim()
  const artist = getSongArtist(song)
  const base = [title, artist].filter(Boolean).join(' ').trim()
  return base || fallbackText
}

function detectRoute(text: string): ModeValue {
  if (activeMode.value === 'song' || activeMode.value === 'chord' || activeMode.value === 'practice') return activeMode.value
  if (/配和弦|和弦|歌词/.test(text) && text.length > 20) return 'chord'
  if (/练习|开始练|滚谱/.test(text)) return 'practice'
  if (isCreationIntent(text) && !isTabSearchIntent(text)) return 'song'
  return 'search'
}

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

function normalizeChords(result: AiSongResult) {
  return result.chords?.length ? result.chords.join(' · ') : `${result.key || 'C'}调 · ${result.difficulty || '新手'}`
}

function getOutputType(_candidate?: WebSongCandidate | null): TabOutputType {
  return 'both'
}

function getOutputTypeLabel(_type: TabOutputType) {
  return '完整曲谱'
}

function getOutputTypeDesc(_type: TabOutputType, result: AiSongResult) {
  return `${normalizeChords(result)} · TXT谱 + 图片六线谱`
}

function resetSearchState() {
  webCandidates.value = []
  webCandidate.value = null
  lastResult.value = null
}

function buildQuickUrl(text: string, mode: 'web' | 'image' | 'site52' | 'jita5' | 'jitabang' | 'qupu123') {
  const queryMap = {
    web: `${text} 吉他谱 和弦谱 弹唱谱`,
    image: `${text} 吉他谱 图片谱`,
    site52: `site:52cmajor.com ${text} 吉他谱`,
    jita5: `site:jita5.com ${text} 吉他谱`,
    jitabang: `site:jitabang.com ${text} 吉他谱`,
    qupu123: `site:qupu123.com ${text} 吉他谱`,
  }
  const query = queryMap[mode]
  if (mode === 'image') return `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(query)}`
  return `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`
}

function createEmergencySearchCandidate(text: string): WebSongCandidate {
  const title = normalizeSearchText(text) || text
  const refs: any[] = [
    { title: `图片谱：${title}`, url: buildQuickUrl(title, 'image'), snippet: '优先查找图片谱，适合先看原谱。', provider: 'local_quick_entry', result_type: 'image', importable: false, previewable: true, action_hint: 'preview', action_label: '预览图片谱' },
    { title: `搜索：${title} 吉他谱`, url: buildQuickUrl(title, 'web'), snippet: '网络较慢时可先用这个入口查找曲谱资源。', provider: 'local_quick_entry', result_type: 'fallback', importable: false, previewable: false, action_hint: 'view_only', action_label: '打开搜索' },
    { title: `52C大调：${title}`, url: buildQuickUrl(title, 'site52'), snippet: '在 52cmajor.com 内定向搜索曲谱。', provider: 'local_site_entry', result_type: 'fallback', importable: false, previewable: false, action_hint: 'view_only', action_label: '打开搜索' },
    { title: `吉他屋：${title}`, url: buildQuickUrl(title, 'jita5'), snippet: '在 jita5.com 内定向搜索曲谱。', provider: 'local_site_entry', result_type: 'fallback', importable: false, previewable: false, action_hint: 'view_only', action_label: '打开搜索' },
    { title: `吉他帮：${title}`, url: buildQuickUrl(title, 'jitabang'), snippet: '在 jitabang.com 内定向搜索曲谱。', provider: 'local_site_entry', result_type: 'fallback', importable: false, previewable: false, action_hint: 'view_only', action_label: '打开搜索' },
    { title: `曲谱123：${title}`, url: buildQuickUrl(title, 'qupu123'), snippet: '在 qupu123.com 内定向搜索曲谱。', provider: 'local_site_entry', result_type: 'fallback', importable: false, previewable: false, action_hint: 'view_only', action_label: '打开搜索' },
  ]
  return {
    title,
    artist: '',
    album: '',
    confidence: 0.5,
    source: 'local_quick_entry',
    summary: '网络搜索暂时较慢，已提供图片谱和曲谱站入口，也可以直接生成完整曲谱。',
    references: refs,
    tabReferences: refs,
    preferred_output_type: 'both',
    arrangementHints: { tabReferenceCount: refs.length, imageReferenceCount: 1, textReferenceCount: 0, viewOnlyCount: refs.length - 1, outputPreference: 'both' },
  }
}

async function showEmergencySearch(text: string, reason = '网络搜索暂时较慢') {
  const candidate = createEmergencySearchCandidate(text)
  webCandidates.value = [candidate]
  webCandidate.value = null
  webResultLabel.value = '曲谱快速入口'
  await streamAiMessage(`${reason}，已先给你图片谱入口和曲谱站入口。也可以直接生成完整曲谱。`)
  nextTick(() => { scrollTop.value += 560 })
}

function seedSongToCandidate(song: Song | any): WebSongCandidate {
  return {
    title: song.title || '未命名歌曲',
    artist: song.artist_name || song.author_name || '',
    album: song.album || '',
    confidence: Math.min(0.92, Math.max(0.62, Number(song._search_score || 78) / 100)),
    source: song.source_type || 'seed',
    summary: `热门曲库已识别《${song.title || '这首歌'}》${song.artist_name ? ` - ${song.artist_name}` : ''}，可以继续搜索资源，也可以生成完整曲谱。`,
    references: song.generation_source?.references || [],
    tabReferences: song.generation_source?.tabReferences || [],
    preferred_output_type: 'both',
    arrangementHints: song.generation_source?.arrangementHints || song.content_json?.arrangementHints || { outputPreference: 'both' },
  }
}

async function lookupWebCandidate(text: string, forceRefresh = false) {
  lastSearchText.value = text
  await streamAiMessage(forceRefresh ? '正在重新搜索最新曲谱资源。' : '正在为你搜索曲谱资源。')
  try {
    const web = await searchWebSong(text, { forceRefresh })
    const candidates = (web.candidates || []).map(item => ({ ...item, preferred_output_type: 'both' as const }))
    if (!candidates.length) {
      await showEmergencySearch(text, '暂未找到稳定匹配资源')
      return
    }
    webCandidates.value = candidates
    webCandidate.value = null
    webResultLabel.value = web.tabSearchEnabled ? '曲谱搜索结果' : '歌曲搜索结果'
    const first = candidates[0]
    const refs = first.tabReferences || first.references || []
    const previewCount = refs.filter((item: any) => item.previewable).length
    const clueCount = refs.filter((item: any) => item.importable || item.result_type === 'text').length
    await streamAiMessage(`已找到 ${refs.length || candidates.length} 条相关结果：${previewCount} 条图片谱、${clueCount} 条编配线索。确认歌曲后会生成 TXT 谱和图片六线谱。`)
    nextTick(() => { scrollTop.value += 560 })
  } catch (error: any) {
    await showEmergencySearch(text, error?.message || '网络搜索暂时较慢')
  }
}

async function lookupTabCandidate(text: string, forceRefresh = false) {
  lastSearchText.value = text
  await streamAiMessage(forceRefresh ? '正在绕开缓存重新搜索曲谱资源。' : '正在搜索吉他谱、和弦谱和图片谱资源。')
  try {
    const web = await searchWebTabs(text, { forceRefresh })
    const candidates = (web.candidates || []).map(item => ({ ...item, preferred_output_type: 'both' as const }))
    if (!candidates.length) {
      await showEmergencySearch(text, '暂未找到稳定曲谱资源')
      return
    }
    webCandidates.value = candidates
    webCandidate.value = null
    webResultLabel.value = forceRefresh ? '最新曲谱资源' : '吉他谱资源'
    const refs = candidates[0]?.tabReferences || candidates[0]?.references || []
    const previewCount = refs.filter((item: any) => item.previewable).length
    const clueCount = refs.filter((item: any) => item.importable || item.result_type === 'text').length
    await streamAiMessage(`已找到 ${refs.length || candidates.length} 条曲谱资源：${previewCount} 条可预览、${clueCount} 条可作为 AI 编配线索。确认后会生成完整曲谱。`)
    nextTick(() => { scrollTop.value += 560 })
  } catch (error: any) {
    await showEmergencySearch(text, error?.message || '曲谱搜索暂时较慢')
  }
}

async function refreshLastSearch() {
  const text = lastSearchText.value || inputText.value.trim()
  if (!text || loading.value || webGenerating.value) {
    focusInput()
    return
  }
  resetSearchState()
  loading.value = true
  try {
    await lookupTabCandidate(text, true)
  } finally {
    loading.value = false
  }
}

async function selectWebCandidate(candidate: WebSongCandidate) {
  webCandidate.value = { ...candidate, preferred_output_type: 'both' }
  await streamAiMessage(`已选择《${candidate.title}》${candidate.artist ? ` - ${candidate.artist}` : ''}。点击生成后会同时得到 TXT 谱和图片六线谱。`)
  nextTick(() => { scrollTop.value += 420 })
}

function backToSearchResults() {
  webCandidate.value = null
  nextTick(() => { scrollTop.value += 320 })
}

async function generateFromWebCandidate() {
  if (!webCandidate.value || webGenerating.value) return
  webGenerating.value = true
  const candidate = { ...webCandidate.value, preferred_output_type: 'both' as const }
  const outputType = getOutputType(candidate)
  const outputLabel = getOutputTypeLabel(outputType)
  try {
    await ensureLogin()
    await streamAiMessage(`正在生成《${candidate.title}》${outputLabel}，完成后自动打开详情页。`)
    const result = await createWebChords({ title: candidate.title, artist: candidate.artist, key: 'C', difficulty: '新手', web_context: candidate, output_type: outputType })
    if (!result.songId) {
      await streamAiMessage('曲谱已生成，但未返回曲谱编号。请稍后重试。')
      return
    }
    await streamAiMessage(`已生成《${result.title}》完整曲谱。详情页可切换 TXT 谱和图片六线谱。`)
    lastResult.value = { songId: result.songId, title: result.title, chords: getOutputTypeDesc(outputType, result) }
    webCandidate.value = null
    webCandidates.value = []
    setTimeout(() => {
      openSong(result.songId)
    }, 520)
  } catch (error: any) {
    await streamAiMessage(error?.message || '曲谱生成暂时不可用，请稍后再试。')
  } finally {
    webGenerating.value = false
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || loading.value || webGenerating.value) return
  inputText.value = ''
  resetSearchState()
  pushMessage('user', text)
  loading.value = true
  try {
    const route = detectRoute(text)
    if (route === 'search' || route === 'practice') {
      saveRecentSearch(text)
      lastSearchText.value = text
      if (isTabSearchIntent(text)) {
        await lookupTabCandidate(text)
        return
      }
      const result = await searchSongs({ keyword: text, page_size: 8 })
      const reliableItems = getReliableLocalSongs(result.items, text)
      if (!reliableItems.length) {
        await lookupWebCandidate(text)
        return
      }
      const first = reliableItems[0] as Song | any
      if (isSeedOnlySong(first)) {
        const webKeyword = buildSongAwareSearchText(first, text)
        const artist = getSongArtist(first)
        await streamAiMessage(`已识别《${first.title || text}》${artist ? ` - ${artist}` : ''}，继续搜索可参考的吉他谱资源。`)
        await lookupTabCandidate(webKeyword)
        return
      }
      await streamAiMessage(`找到 ${reliableItems.length} 首相关曲谱。最匹配的是《${first.title}》，可以打开查看或开始练习。`)
      lastResult.value = { songId: first.id, title: first.title, chords: `${first.song_key || 'C'}调 · ${first.difficulty || '新手'} · ${first.favorite_count || 0} 收藏` }
      if (route === 'practice') startPractice(first.id)
      return
    }
    await ensureLogin()
    const result = route === 'chord'
      ? await createChords({ lyrics: text, key: 'C', difficulty: '新手', rhythm: 'auto' })
      : await createSongwriting({ prompt: text, style: '民谣', difficulty: '新手', key: 'C', language: '中文' })
    if (!result.songId) {
      await streamAiMessage('生成已完成，但未返回曲谱编号。请稍后重试。')
      return
    }
    await streamAiMessage(`已生成《${result.title}》。和弦走向：${normalizeChords(result)}。`)
    lastResult.value = { songId: result.songId, title: result.title, chords: normalizeChords(result) }
  } catch (error: any) {
    await streamAiMessage(error?.message || '服务暂时不可用，请稍后再试。')
  } finally {
    loading.value = false
  }
}

function openSong(songId?: string | number) {
  if (!songId) return
  uni.navigateTo({ url: `/pages/song-detail/index?id=${songId}` })
}

function startPractice(songId?: string | number) {
  if (!songId) return
  uni.navigateTo({ url: `/pages/practice/index?id=${songId}` })
}

function saveResult() {
  uni.showToast({ title: '已保存到我的作品', icon: 'success' })
}

function openRecord() { uni.navigateTo({ url: '/pages/record/index' }) }
function goMain(url: string) { pageLeaving.value = true; setTimeout(() => { uni.reLaunch({ url }) }, 120) }
function handleTabChange(value: string) { if (value === 'chat') return; if (value === 'tuner') goMain('/pages/community/index'); if (value === 'mine') goMain('/pages/mine/index') }
</script>

<style scoped>
.page { --page-bg: #F6FBF8; --card-bg: rgba(255, 255, 255, 0.96); --control-bg: rgba(255, 255, 255, 0.94); --line-soft: #E8EFEA; --text-main: #17231E; --text-strong: #101821; --brand: #0BA45A; --brand-bright: #0BB861; --skeleton-bg: #EAF1ED; min-height: 100vh; width: 750rpx; background: var(--page-bg); padding-bottom: 244rpx; box-sizing: border-box; transition: opacity 0.16s ease, transform 0.16s ease; }
.page--leaving { opacity: 0; transform: translateY(12rpx) scale(0.992); }
.content { height: calc(100vh - 244rpx); box-sizing: border-box; }
.page-content { animation: contentIn 0.32s ease both; }
.skeleton-page { width: 750rpx; padding: calc(env(safe-area-inset-top) + 104rpx) 32rpx 0; box-sizing: border-box; }
.skeleton-block { position: relative; overflow: hidden; background: var(--skeleton-bg); }
.skeleton-block::after { content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 60%; background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.64), rgba(255,255,255,0)); animation: shimmer 1.18s ease-in-out infinite; }
.skeleton-hero { width: 686rpx; height: 110rpx; border-radius: 30rpx; }
.skeleton-grid { margin-top: 32rpx; display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; }
.skeleton-card { height: 258rpx; border-radius: 28rpx; }
.skeleton-chat { margin-top: 46rpx; display: flex; align-items: flex-start; }
.skeleton-avatar { width: 72rpx; height: 72rpx; border-radius: 999rpx; margin-right: 20rpx; }
.skeleton-bubble { width: 548rpx; height: 360rpx; border-radius: 28rpx; }
.section-space { height: 32rpx; }
.chat-area { margin-top: 46rpx; padding-bottom: 36rpx; }
.typing-row { width: 750rpx; padding: 0 32rpx; margin-bottom: 24rpx; display: flex; align-items: flex-start; box-sizing: border-box; }
.typing-avatar { width: 72rpx; height: 72rpx; margin-right: 20rpx; border-radius: 999rpx; background: linear-gradient(135deg, var(--brand-bright) 0%, var(--brand) 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 800; }
.typing-bubble { height: 64rpx; padding: 0 28rpx; border-radius: 999rpx; background: var(--card-bg); border: 1rpx solid var(--line-soft); display: flex; align-items: center; gap: 10rpx; }
.typing-dot { width: 10rpx; height: 10rpx; border-radius: 999rpx; background: var(--brand); animation: typing 0.9s infinite ease-in-out; }
.typing-dot:nth-child(2) { animation-delay: .12s; }
.typing-dot:nth-child(3) { animation-delay: .24s; }
.input-bar { position: fixed; left: 0; right: 0; bottom: 132rpx; width: 750rpx; padding: 14rpx 32rpx 16rpx; box-sizing: border-box; background: var(--page-bg); display: flex; align-items: center; gap: 14rpx; z-index: 18; }
.voice-btn { width: 72rpx; height: 72rpx; border-radius: 999rpx; background: var(--control-bg); border: 1rpx solid var(--line-soft); box-shadow: 0 10rpx 24rpx rgba(23, 35, 30, 0.045); display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.input-shell { flex: 1; height: 72rpx; min-width: 0; border-radius: 999rpx; background: var(--card-bg); border: 1rpx solid var(--line-soft); box-shadow: 0 10rpx 24rpx rgba(23, 35, 30, 0.045); display: flex; align-items: center; box-sizing: border-box; overflow: hidden; }
.chat-input { flex: 1; min-width: 0; height: 72rpx; padding: 0 10rpx 0 26rpx; box-sizing: border-box; font-size: 26rpx; color: var(--text-main); }
.tool-btn { width: 54rpx; height: 72rpx; color: var(--text-strong); font-size: 30rpx; line-height: 72rpx; text-align: center; flex-shrink: 0; }
.music-tool { font-size: 34rpx; color: var(--text-strong); }
.send-btn { width: 104rpx; height: 72rpx; border-radius: 999rpx; background: linear-gradient(135deg, var(--brand-bright) 0%, var(--brand) 100%); color: #FFFFFF; font-size: 27rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 14rpx 26rpx rgba(16, 177, 90, 0.2); flex-shrink: 0; }
.send-btn.loading { opacity: .72; }
@keyframes contentIn { from { opacity: 0; transform: translateY(20rpx); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer { from { transform: translateX(0); } to { transform: translateX(280%); } }
@keyframes typing { 0%, 80%, 100% { opacity: .34; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-5rpx); } }
@media (prefers-color-scheme: dark) { .page { --page-bg: #0F1512; --card-bg: rgba(24, 31, 27, 0.96); --control-bg: rgba(24, 31, 27, 0.94); --line-soft: rgba(255, 255, 255, 0.1); --text-main: #F4F7F5; --text-strong: #FFFFFF; --brand: #32D579; --brand-bright: #43E58B; --skeleton-bg: #1C2620; } }
</style>