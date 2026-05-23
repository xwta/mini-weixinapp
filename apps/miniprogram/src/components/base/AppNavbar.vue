<template>
  <view class="app-navbar">
    <view class="navbar-left" @tap="onBack">
      <text class="navbar-icon">‹</text>
    </view>
    <view class="navbar-title">{{ title }}</view>
    <view class="navbar-right" @tap="onRightTap">
      <slot name="right">
        <text v-if="rightText" class="navbar-right-text">{{ rightText }}</text>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  showBack?: boolean
  rightText?: string
}>()

const emit = defineEmits<{
  back: []
  rightTap: []
}>()

function onBack() {
  if (props.showBack === false) return
  emit('back')
}

function onRightTap() {
  emit('rightTap')
}
</script>

<style scoped>
.app-navbar {
  width: 750rpx;
  height: 96rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF;
}

.navbar-left,
.navbar-right {
  width: 120rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
}

.navbar-right {
  justify-content: flex-end;
}

.navbar-icon {
  font-size: 52rpx;
  line-height: 1;
  color: #17231E;
}

.navbar-title {
  flex: 1;
  text-align: center;
  font-size: 36rpx;
  font-weight: 700;
  color: #17231E;
}

.navbar-right-text {
  font-size: 26rpx;
  color: #0BA45A;
  font-weight: 600;
}
</style>
