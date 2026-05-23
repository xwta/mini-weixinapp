<template>
  <view class="search-wrap">
    <view class="search-bar">
      <text class="search-icon">⌕</text>
      <input
        class="search-input"
        :placeholder="placeholder"
        :value="modelValue"
        @input="onInput"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
}>(),{
  placeholder:'搜索歌曲、用户、话题'
})

const emit = defineEmits<{
  'update:modelValue':[value:string]
}>()

function onInput(e:any){
 emit('update:modelValue',e.detail.value)
}
</script>

<style scoped>
.search-wrap{
 padding:0 32rpx;
 box-sizing:border-box;
}

.search-bar{
 height:72rpx;
 border-radius:999rpx;
 background:#FFFFFF;
 border:1rpx solid #E8EFEA;
 display:flex;
 align-items:center;
 padding:0 24rpx;
}

.search-icon{
 color:#A4AEA8;
 font-size:30rpx;
 margin-right:16rpx;
}

.search-input{
 flex:1;
 font-size:28rpx;
 color:#17231E;
}
</style>
