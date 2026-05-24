<template>
  <view class="bottom-tab">
    <view
      v-for="item in tabs"
      :key="item.value"
      class="tab-item"
      @tap="emit('change', item.value)"
    >
      <view class="tab-pill" :class="{ active: active === item.value }">
        <text class="tab-icon">{{ item.icon }}</text>
        <text class="tab-label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  active?: 'chat' | 'community' | 'mine'
}>(), {
  active: 'chat',
})

const emit = defineEmits<{
  change: [value: string]
}>()

const tabs = [
  { label: '谱灵', value: 'chat', icon: '♪' },
  { label: '社区', value: 'community', icon: '◎' },
  { label: '我的', value: 'mine', icon: '♙' },
]
</script>

<style scoped>
.bottom-tab {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 750rpx;
  height: 126rpx;
  padding: 14rpx 32rpx calc(env(safe-area-inset-bottom) + 10rpx);
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid rgba(232, 239, 234, 0.88);
  display: flex;
  box-sizing: border-box;
  z-index: 20;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-pill {
  width: 88rpx;
  height: 78rpx;
  border-radius: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6F7A83;
  transition: all 0.18s ease;
}

.tab-pill.active {
  width: 176rpx;
  background: #EAF8F0;
  color: #0BA45A;
}

.tab-icon {
  font-size: 34rpx;
  line-height: 34rpx;
  font-weight: 800;
}

.tab-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 26rpx;
  font-weight: 700;
}
</style>
