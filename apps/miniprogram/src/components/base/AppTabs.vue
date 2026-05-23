<template>
  <scroll-view class="app-tabs" scroll-x :show-scrollbar="false">
    <view class="tabs-inner">
      <view
        v-for="item in items"
        :key="item.value"
        class="tab-item"
        :class="{ active: modelValue === item.value }"
        @tap="selectTab(item.value)"
      >
        {{ item.label }}
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
export interface TabItem {
  label: string
  value: string
}

const props = defineProps<{
  items: TabItem[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

function selectTab(value: string) {
  if (value === props.modelValue) return
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.app-tabs {
  width: 750rpx;
  white-space: nowrap;
  box-sizing: border-box;
}

.tabs-inner {
  display: flex;
  gap: 16rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.tab-item {
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFEA;
  color: #6B756F;
  font-size: 26rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.tab-item.active {
  color: #FFFFFF;
  background: #0BA45A;
  border-color: #0BA45A;
  font-weight: 700;
}
</style>
