<template>
  <view class="page">
    <view class="content">
      <HomeHero @openRecord="openRecord" />

      <view class="section-space" />

      <HomeModeGrid :items="modeItems" @select="selectMode" />

      <view class="chat-area">
        <ChatBubble role="ai" content="今天想玩什么？可以写歌、搜谱、配和弦，也可以让我带你练。" />
        <ChatBubble role="user" content="帮我写一首毕业民谣，适合新手弹唱。" />
        <AiResultCard title="毕业以后" chords="C · G · Am · F" />
      </view>
    </view>

    <view class="input-bar">
      <view class="voice-btn">🎙</view>
      <input class="chat-input" placeholder="输入你的音乐想法..." />
      <view class="send-btn">发送</view>
    </view>

    <AppBottomTab active="chat" @change="handleTabChange" />
  </view>
</template>

<script setup lang="ts">
import HomeHero from '@/components/home/HomeHero.vue'
import HomeModeGrid from '@/components/home/HomeModeGrid.vue'
import ChatBubble from '@/components/home/ChatBubble.vue'
import AiResultCard from '@/components/home/AiResultCard.vue'
import AppBottomTab from '@/components/home/AppBottomTab.vue'

const modeItems = [
  { icon: '♪', label: 'AI写歌', value: 'song' },
  { icon: '⌕', label: '搜谱', value: 'search' },
  { icon: '♬', label: '配和弦', value: 'chord' },
  { icon: '▶', label: '练习', value: 'practice' },
]

function selectMode(value: string) {
  console.log('select mode', value)
}

function openRecord() {
  uni.navigateTo({ url: '/pages/record/index' })
}

function handleTabChange(value: string) {
  if (value === 'chat') return
  if (value === 'community') uni.switchTab({ url: '/pages/community/index' })
  if (value === 'mine') uni.switchTab({ url: '/pages/mine/index' })
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
  padding-top: 24rpx;
}

.section-space {
  height: 24rpx;
}

.chat-area {
  margin-top: 32rpx;
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
</style>
