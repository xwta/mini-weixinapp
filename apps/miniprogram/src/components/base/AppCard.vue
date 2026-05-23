<template>
  <view class="app-card" :class="[`app-card--${type}`]">
    <slot />
  </view>
</template>

<script setup lang="ts">
defineProps<{
  type?: 'default' | 'light'
}>()
</script>

<style scoped>
.app-card {
  width: 686rpx;
  box-sizing: border-box;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  box-shadow: 0 8rpx 28rpx rgba(18,52,36,.06);
}

.app-card--light {
  border-color:#EDF3EF;
  box-shadow:none;
}
</style>
