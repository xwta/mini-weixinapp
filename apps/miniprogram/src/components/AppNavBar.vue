<template>
  <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="nav-inner">
      <view v-if="showBack" class="back" @tap="goBack">←</view>
      <view v-else class="back-placeholder" />
      <view>
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

const statusBarHeight = ref(24)
const systemInfo = uni.getSystemInfoSync()
statusBarHeight.value = systemInfo.statusBarHeight || 24

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/home/index' })
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
}

.back-placeholder {
  width: 58rpx;
  height: 58rpx;
}

.right {
  margin-left: auto;
  min-width: 58rpx;
  min-height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.title {
  color: #123c32;
  font-size: 34rpx;
  font-weight: 900;
}

.subtitle {
  margin-top: 6rpx;
  color: #687078;
  font-size: 24rpx;
}
</style>
