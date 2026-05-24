<template>
  <view class="mode-grid">
    <view
      v-for="(item, index) in items"
      :key="item.value"
      class="mode-card"
      :class="`mode-card--${index}`"
      hover-class="mode-card--pressed"
      hover-stay-time="80"
      @tap="emit('select', item.value)"
    >
      <view class="mode-glow" />
      <view class="mode-icon-wrap">
        <text class="mode-icon">{{ item.icon }}</text>
      </view>

      <view class="mode-title-row">
        <text class="mode-name">{{ item.label }}</text>
        <text v-if="item.badge" class="mode-badge">{{ item.badge }}</text>
      </view>

      <text class="mode-desc">{{ item.desc }}</text>

      <view class="mode-status">
        <view class="status-left">
          <text class="status-icon">{{ item.statusIcon }}</text>
          <text class="status-text">{{ item.statusText }}</text>
        </view>
        <text class="status-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ items: any[] }>()
const emit = defineEmits<{ select: [value: string] }>()
</script>

<style scoped>
.mode-grid {
  width: 750rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
}

.mode-card {
  position: relative;
  min-height: 258rpx;
  padding: 24rpx 24rpx 20rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(232, 239, 234, 0.86);
  box-shadow: 0 18rpx 42rpx rgba(23, 35, 30, 0.045);
  box-sizing: border-box;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  animation: cardRise 0.48s ease both;
}

.mode-card--1 { animation-delay: 0.04s; }
.mode-card--2 { animation-delay: 0.08s; }
.mode-card--3 { animation-delay: 0.12s; }

.mode-card--pressed {
  transform: scale(0.965);
  opacity: 0.86;
  box-shadow: 0 10rpx 24rpx rgba(23, 35, 30, 0.035);
}

.mode-glow {
  position: absolute;
  right: -32rpx;
  top: -42rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 999rpx;
  background: rgba(16, 177, 90, 0.06);
}

.mode-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: #EEF9F2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-icon {
  font-size: 40rpx;
  line-height: 44rpx;
  color: #0BA45A;
  font-weight: 800;
}

.mode-title-row {
  margin-top: 34rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.mode-name {
  font-size: 32rpx;
  line-height: 40rpx;
  color: #101821;
  font-weight: 800;
}

.mode-badge {
  padding: 3rpx 12rpx;
  border-radius: 999rpx;
  background: #EAF8F0;
  color: #0BA45A;
  font-size: 20rpx;
  line-height: 28rpx;
  font-weight: 700;
}

.mode-desc {
  margin-top: 11rpx;
  display: block;
  color: #67717B;
  font-size: 23rpx;
  line-height: 30rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mode-status {
  margin-top: 28rpx;
  height: 54rpx;
  padding: 0 14rpx 0 18rpx;
  border-radius: 999rpx;
  background: rgba(246, 248, 247, 0.96);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.status-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.status-icon {
  font-size: 24rpx;
  line-height: 28rpx;
  color: #0BA45A;
  flex-shrink: 0;
}

.status-text {
  color: #17231E;
  font-size: 24rpx;
  line-height: 30rpx;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-arrow {
  color: #101821;
  font-size: 36rpx;
  line-height: 32rpx;
  flex-shrink: 0;
}

@keyframes cardRise {
  from { opacity: 0; transform: translateY(18rpx) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
