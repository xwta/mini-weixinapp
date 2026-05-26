<template>
  <view class="nav" :style="{ paddingTop: navTop + 'px' }">
    <view class="nav-inner">
      <view v-if="showBack" class="back" @tap="goBack">←</view>
      <view v-else class="back-placeholder" />
      <view class="title-wrap">
        <view class="title">{{ title }}</view>
        <view v-if="subtitle" class="subtitle">{{ subtitle }}</view>
      </view>
      <view class="right">
        <slot name="right" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{ title: string; subtitle?: string; showBack?: boolean }>(), {
  subtitle: '',
  showBack: false,
})

const navTop = ref(56)

try {
  const systemInfo = uni.getSystemInfoSync()
  const menuButton = uni.getMenuButtonBoundingClientRect?.()
  const statusBarHeight = systemInfo.statusBarHeight || 24
  if (menuButton?.bottom) {
    navTop.value = menuButton.bottom + 10
  } else {
    navTop.value = statusBarHeight + 54
  }
} catch (_error) {
  navTop.value = 80
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/chat/index' })
  }
}
</script>

<style scoped lang="scss">
.nav {
  background: #fafaf6;
}

.nav-inner {
  min-height: 96rpx;
  padding: 0 32rpx 18rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-sizing: border-box;
}

.back {
  width: 58rpx;
  height: 58rpx;
  border-radius: 29rpx;
  background: #fff;
  color: #123c32;
  font-size: 36rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-placeholder {
  width: 58rpx;
  height: 58rpx;
  flex-shrink: 0;
}

.title-wrap {
  min-width: 0;
  max-width: 420rpx;
}

.right {
  margin-left: auto;
  min-width: 58rpx;
  min-height: 58rpx;
  padding-right: 174rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.title {
  color: #123c32;
  font-size: 34rpx;
  font-weight: 900;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.subtitle {
  margin-top: 6rpx;
  color: #687078;
  font-size: 24rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
