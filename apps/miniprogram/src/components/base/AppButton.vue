<template>
  <button
    class="app-button"
    :class="[`app-button--${type}`, `app-button--${size}`, { 'is-block': block, 'is-disabled': disabled }]"
    :disabled="disabled"
    @tap="onTap"
  >
    <slot>{{ text }}</slot>
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  text?: string
  type?: 'primary' | 'secondary' | 'ghost'
  size?: 'normal' | 'small'
  block?: boolean
  disabled?: boolean
}>(), {
  type: 'primary',
  size: 'normal',
  block: false,
  disabled: false,
})

const emit = defineEmits<{
  tap: []
}>()

function onTap() {
  if (props.disabled) return
  emit('tap')
}
</script>

<style scoped>
.app-button {
  margin: 0;
  padding: 0 32rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  box-sizing: border-box;
}

.app-button::after {
  border: none;
}

.app-button--primary {
  color: #FFFFFF;
  background: #0BA45A;
}

.app-button--secondary {
  color: #17231E;
  background: #FFFFFF;
  border: 1rpx solid #E1EAE5;
}

.app-button--ghost {
  color: #0BA45A;
  background: #EAF8F0;
}

.app-button--small {
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
}

.is-block {
  width: 100%;
}

.is-disabled {
  opacity: 0.45;
}
</style>
