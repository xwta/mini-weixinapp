<template>
  <view class="bottom-tab">
    <view
      v-for="item in tabs"
      :key="item.value"
      class="tab-item"
      :class="{ active: active === item.value }"
      @tap="emit('change', item.value)"
    >
      <text class="tab-icon">{{ item.icon }}</text>
      <text class="tab-label">{{ item.label }}</text>
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
  { label: '我的', value: 'mine', icon: '人' },
]
</script>

<style scoped>
.bottom-tab {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 750rpx;
  height: 112rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: #FFFFFF;
  border-top: 1rpx solid #E8EFEA;
  display: flex;
  z-index: 20;
}

.tab-item {
  flex: 1;
  height: 112rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #A4AEA8;
}

.tab-icon {
  font-size: 34rpx;
  line-height: 38rpx;
  font-weight: 700;
}

.tab-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 28rpx;
}

.tab-item.active {
  color: #0BA45A;
}
</style>
