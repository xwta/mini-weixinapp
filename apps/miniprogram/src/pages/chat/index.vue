<template>
  <view class="page">
    <scroll-view class="content" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <HomeHero @openRecord="openRecord" />

      <view class="section-space" />

      <HomeModeGrid :items="modeItems" @select="selectMode" />

      <view class="chat-area">
        <ChatBubble
          v-for="message in messages"
          :key="message.id"
          :role="message.role"
          :content="message.content"
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
    </scroll-view>

    <view class="input-bar">
      <view class="voice-btn" @tap="fillVoiceHint">🎙</view>
      <input
        v-model="inputText"
        class="chat-input"
        confirm-type="send"
        :disabled="loading"
        :placeholder="loading ? '谱灵正在拨弦思考...' : placeholder"
        @confirm="sendMessage"
      />
      <view :class="['send-btn', loading && 'loading']" @tap="sendMessage">{{ loading ? '生成中' : '发送' }}</view>
    </view>

    <AppBottomTab active="chat" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import HomeHero from '@/components/home/HomeHero.vue'
import HomeModeGrid from '@/components/home/HomeModeGrid.vue'
import ChatBubble from '@/components/home/ChatBubble.vue'
import AiResultCard from '@/components/home/AiResultCard.vue'
import AppBottomTab from '@/components/home/AppBottomTab.vue'
import { loginWithWechatProfile } from '@/api/auth'
import { createChords, createSongwriting } from '@/api/ai'
import { searchSongs } from '@/api/songs'
import { useAuthStore } from '@/stores/auth'
import type { AiSongResult } from '@/types'

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

type ModeValue = 'song' | 'search' | 'chord' | 'practice'

const inputText = ref('')
const activeMode = ref<ModeValue>('song')
const loading = ref(false)
const scrollTop = ref(0)
const placeholder = ref('输入你的音乐想法...')
const lastResult = ref<ResultCardState | null>(null)

const messages = ref<ChatMessage[]>([
  {
    id: 'welcome',
    role: 'ai',
    content: '今天想玩什么？可以写歌、搜谱、配和弦，也可以让我带你练。',
  },
])

const modeItems = [
  { icon: '♪', label: 'AI写歌', value: 'song' },
  { icon: '⌕', label: '搜谱', value: 'search' },
  { icon: '♬', label: '配和弦', value: 'chord' },
  { icon: '▶', label: '练习', value: 'practice' },
]

function selectMode(value: string) {
  activeMode.value = value as ModeValue
  const prompts: Record<ModeValue, string> = {
    song: '比如：写一首毕业民谣，C调，新手能弹',
    search: '比如：晴天 / 成都 / 民谣 / 周杰伦',
    chord: '粘贴歌词，我来自动配和弦',
    practice: '输入歌名，我帮你找谱开始练',
  }
  placeholder.value = prompts[activeMode.value]
}

function fillVoiceHint() {
  uni.showToast({ title: '语音输入待接入', icon: 'none' })
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

function detectRoute(text: string): ModeValue {
  if (activeMode.value !== 'song') return activeMode.value
  if (/搜|找|曲谱|吉他谱|谱子/.test(text)) return 'search'
  if (/配和弦|和弦|歌词/.test(text) && text.length > 20) return 'chord'
  if (/练习|开始练|滚谱/.test(text)) return 'practice'
  return 'song'
}

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

function normalizeChords(result: AiSongResult) {
  return result.chords?.length ? result.chords.join(' · ') : `${result.key || 'C'}调 · ${result.difficulty || '新手'}`
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  inputText.value = ''
  pushMessage('user', text)
  loading.value = true

  try {
    const route = detectRoute(text)

    if (route === 'search' || route === 'practice') {
      const result = await searchSongs({ keyword: text, page_size: 5 })
      if (!result.items.length) {
        pushMessage('ai', '暂时没搜到合适曲谱。你可以换个关键词，或者让我直接生成一首。')
        return
      }

      const first = result.items[0]
      pushMessage('ai', `找到 ${result.items.length} 首相关曲谱。最匹配的是《${first.title}》，可以直接打开练习。`)
      lastResult.value = {
        songId: first.id,
        title: first.title,
        chords: `${first.song_key || 'C'}调 · ${first.difficulty || '新手'} · ${first.favorite_count || 0} 收藏`,
      }
      if (route === 'practice') startPractice(first.id)
      return
    }

    await ensureLogin()
    const result = route === 'chord'
      ? await createChords({ lyrics: text, key: 'C', difficulty: '新手', rhythm: 'auto' })
      : await createSongwriting({ prompt: text, style: '民谣', difficulty: '新手', key: 'C', language: '中文' })

    if (!result.songId) {
      pushMessage('ai', '生成完成，但没有拿到曲谱 ID。请稍后重试一次。')
      return
    }

    pushMessage('ai', `已生成《${result.title}》。和弦走向：${normalizeChords(result)}。`)
    lastResult.value = {
      songId: result.songId,
      title: result.title,
      chords: normalizeChords(result),
    }
  } catch (error: any) {
    pushMessage('ai', error?.message || '刚才的灵感断了根弦，请稍后再试。')
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

function openRecord() {
  uni.navigateTo({ url: '/pages/record/index' })
}

function goMain(url: string) {
  uni.reLaunch({ url })
}

function handleTabChange(value: string) {
  if (value === 'chat') return
  if (value === 'community') goMain('/pages/community/index')
  if (value === 'mine') goMain('/pages/mine/index')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  width: 750rpx;
  background: #F6FBF8;
  padding-bottom: 220rpx;
  box-sizing: border-box;
}

.content {
  height: calc(100vh - 220rpx);
  box-sizing: border-box;
}

.section-space {
  height: 24rpx;
}

.chat-area {
  margin-top: 32rpx;
  padding-bottom: 36rpx;
}

.input-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 112rpx;
  width: 750rpx;
  padding: 16rpx 32rpx;
  box-sizing: border-box;
  background: rgba(246, 251, 248, 0.96);
  display: flex;
  align-items: center;
  gap: 16rpx;
  z-index: 18;
}

.voice-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}

.chat-input {
  flex: 1;
  height: 72rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  padding: 0 28rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #17231E;
}

.send-btn {
  height: 72rpx;
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

.send-btn.loading {
  opacity: .7;
}
</style>