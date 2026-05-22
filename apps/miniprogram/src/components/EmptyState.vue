<template>
  <view class="empty">
    <view class="icon">{{ icon }}</view>
    <view class="title">{{ title }}</view>
    <view class="desc">{{ desc }}</view>
    <view v-if="buttonText" class="button" @tap="$emit('action')">{{ buttonText }}</view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ title: string; desc: string; icon?: string; buttonText?: string }>()
defineEmits<{ action: [] }>()
</script>

<style scoped lang="scss">
.empty {
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.icon {
  width: 136rpx;
  height: 136rpx;
  border-radius: 48rpx;
  background: #e8f7f0;
  color: #1e7a5a;
  font-size: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  margin-top: 28rpx;
  color: #123c32;
  font-size: 34rpx;
  font-weight: 900;
}

.desc {
  margin-top: 12rpx;
  color: #687078;
  font-size: 26rpx;
  line-height: 1.5;
}

.button {
  margin-top: 32rpx;
  min-width: 220rpx;
  height: 76rpx;
  padding: 0 34rpx;
  border-radius: 38rpx;
  background: #1e7a5a;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
