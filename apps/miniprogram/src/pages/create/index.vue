<template>
  <view class="create-page">
    <AppNavBar title="创作" subtitle="手动建谱，或让 AI 帮你写" />

    <view class="container">
      <view class="create-switch">
        <view :class="['switch-item', createMode === 'ai' && 'active']" @tap="createMode = 'ai'">AI 创建</view>
        <view :class="['switch-item', createMode === 'manual' && 'active']" @tap="goManualCreate">手动创建</view>
      </view>

      <view v-if="createMode === 'manual'" class="manual-card card" @tap="goManualCreate">
        <view class="manual-icon">✍</view>
        <view class="manual-title">手动创建吉他谱</view>
        <view class="manual-desc">自己填写歌名、歌手、调式和曲谱正文，像有谱么一样沉淀自己的谱库。</view>
        <view class="manual-btn">进入编辑器</view>
      </view>

      <template v-else>
        <view class="mode-tabs">
          <view :class="['mode-tab', mode === 'song' && 'active']" @tap="mode = 'song'">AI 写歌</view>
          <view :class="['mode-tab', mode === 'chords' && 'active']" @tap="mode = 'chords'">歌词配和弦</view>
        </view>

        <view class="input-card card">
          <view class="input-title">{{ mode === 'song' ? '你的灵感' : '粘贴歌词' }}</view>
          <textarea
            v-model="inputText"
            class="textarea"
            :maxlength="1200"
            :placeholder="mode === 'song' ? '比如：写一首关于毕业、夏天和遗憾的校园民谣' : '把你的原创歌词粘贴到这里，AI 会自动配和弦'"
          />
          <view class="input-actions">
            <view class="chip" @tap="fillTemplate">灵感模板</view>
            <view class="chip cream" @tap="randomPrompt">随机一句</view>
            <view class="count">{{ inputText.length }}/1200</view>
          </view>
        </view>

        <view class="section-title">风格</view>
        <view class="option-row">
          <view v-for="item in styles" :key="item" :class="['option', style === item && 'active']" @tap="style = item">{{ item }}</view>
        </view>

        <view class="section-title">难度</view>
        <view class="option-row three">
          <view v-for="item in difficulties" :key="item" :class="['option big', difficulty === item && 'active']" @tap="difficulty = item">{{ item }}</view>
        </view>

        <view class="section-title">调式</view>
        <view class="key-card card">
          <view>
            <view class="key-title">自动推荐适合弹唱的调</view>
            <view class="key-desc">优先使用新手友好和弦</view>
          </view>
          <view class="auto-tag">Auto</view>
        </view>

        <view class="primary-btn submit" @tap="handleGenerate">生成弹唱谱</view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavBar from '../../components/AppNavBar.vue'
import { loginWithWechatProfile } from '../../api/auth'
import { createChords, createSongwriting } from '../../api/ai'
import { useAuthStore } from '../../stores/auth'

const createMode = ref<'ai' | 'manual'>('ai')
const mode = ref<'song' | 'chords'>('song')
const inputText = ref('')
const style = ref('民谣')
const difficulty = ref('新手')

const styles = ['民谣', '流行', '校园', '摇滚']
const difficulties = ['新手', '进阶', '专业']

onShow(() => {
  const draft = uni.getStorageSync('PULING_DRAFT_PROMPT')
  if (draft) {
    inputText.value = draft
    uni.removeStorageSync('PULING_DRAFT_PROMPT')
  }
})

function goManualCreate() {
  createMode.value = 'manual'
  uni.navigateTo({ url: '/pages/manual-create/index' })
}

function fillTemplate() {
  inputText.value = mode.value === 'song'
    ? '写一首关于毕业、夏天、遗憾的校园民谣，适合新手弹唱。'
    : '窗外的风吹过夏天\n你低头笑得很浅\n我把没说出口的话\n写进旧吉他的弦'
}

function randomPrompt() {
  const prompts = [
    '写一首关于深夜、出租屋和旧吉他的民谣。',
    '写一首关于异地恋、车站和没说完的话的流行歌。',
    '写一首关于初入社会、孤独和梦想的弹唱歌。',
  ]
  inputText.value = prompts[Math.floor(Math.random() * prompts.length)]
}

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

async function handleGenerate() {
  if (!inputText.value.trim()) {
    uni.showToast({ title: '先写点灵感吧', icon: 'none' })
    return
  }
  await ensureLogin()
  const result = mode.value === 'song'
    ? await createSongwriting({ prompt: inputText.value.trim(), style: style.value, difficulty: difficulty.value, key: 'auto', language: '中文' })
    : await createChords({ lyrics: inputText.value.trim(), key: 'auto', difficulty: difficulty.value, rhythm: 'auto' })
  if (result.songId) uni.navigateTo({ url: `/pages/song-detail/index?id=${result.songId}` })
}
</script>

<style scoped lang="scss">
.create-page { min-height: 100vh; background: #fafaf6; }
.create-switch { height: 88rpx; padding: 8rpx; border-radius: 44rpx; background: #fff; display: flex; gap: 8rpx; margin-bottom: 28rpx; }
.switch-item { flex: 1; border-radius: 36rpx; color: #687078; font-size: 28rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.switch-item.active { background: #1e7a5a; color: #fff; }
.manual-card { padding: 42rpx; }
.manual-icon { width: 96rpx; height: 96rpx; border-radius: 36rpx; background: #e8f7f0; color: #1e7a5a; display:flex; align-items:center; justify-content:center; font-size: 46rpx; }
.manual-title { margin-top: 28rpx; color:#123c32; font-size: 38rpx; font-weight: 900; }
.manual-desc { margin-top: 16rpx; color:#687078; font-size: 26rpx; line-height: 1.6; }
.manual-btn { margin-top: 34rpx; width: 220rpx; height: 74rpx; border-radius: 37rpx; background:#1e7a5a; color:#fff; display:flex; align-items:center; justify-content:center; font-size: 26rpx; font-weight: 900; }
.mode-tabs { height: 88rpx; padding: 8rpx; border-radius: 44rpx; background: #fff; display: flex; gap: 8rpx; }
.mode-tab { flex: 1; border-radius: 36rpx; color: #687078; font-size: 28rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.mode-tab.active { background: #1e7a5a; color: #fff; }
.input-card { margin-top: 28rpx; padding: 32rpx; }
.input-title { color: #123c32; font-size: 30rpx; font-weight: 900; }
.textarea { margin-top: 24rpx; width: 100%; min-height: 220rpx; color: #1f2428; font-size: 28rpx; line-height: 1.6; }
.input-actions { margin-top: 20rpx; display: flex; align-items: center; gap: 16rpx; }
.chip { height: 52rpx; padding: 0 24rpx; border-radius: 26rpx; background: #e8f7f0; color: #1e7a5a; font-size: 24rpx; font-weight: 800; display: flex; align-items: center; }
.chip.cream { background: #fff3cf; color: #8a5a24; }
.count { margin-left: auto; color: #a0a7ae; font-size: 24rpx; }
.option-row { display: flex; gap: 18rpx; flex-wrap: wrap; }
.option { min-width: 128rpx; height: 72rpx; padding: 0 28rpx; border-radius: 36rpx; background: #fff; color: #687078; font-size: 26rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.option.big { flex: 1; height: 86rpx; }
.option.active { background: #1e7a5a; color: #fff; }
.key-card { padding: 30rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.key-title { color: #123c32; font-size: 30rpx; font-weight: 900; }
.key-desc { margin-top: 10rpx; color: #687078; font-size: 24rpx; }
.auto-tag { color: #1e7a5a; font-size: 30rpx; font-weight: 900; }
.submit { margin-top: 48rpx; }
</style>
