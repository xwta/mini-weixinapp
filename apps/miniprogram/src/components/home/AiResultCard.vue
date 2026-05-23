<template>
  <view class="result-card">
    <text class="song-title">{{ title }}</text>
    <text class="song-chords">{{ chords }}</text>

    <view class="actions">
      <view class="action-btn">查看曲谱</view>
      <view class="action-btn">开始练习</view>
      <view class="action-btn">保存</view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  chords?: string
}>(), {
  title: '毕业以后',
  chords: 'C · G · Am · F'
})
</script>

<style scoped>
.result-card{
 width:686rpx;
 margin:0 32rpx 24rpx;
 padding:24rpx;
 box-sizing:border-box;
 border-radius:24rpx;
 background:#FFFFFF;
 border:1rpx solid #E8EFEA;
 box-shadow:0 8rpx 28rpx rgba(18,52,36,.06);
}

.song-title{
 display:block;
 font-size:32rpx;
 font-weight:700;
 color:#17231E;
}

.song-chords{
 display:block;
 margin-top:12rpx;
 font-size:24rpx;
 color:#6B756F;
}

.actions{
 margin-top:24rpx;
 display:flex;
 gap:12rpx;
}

.action-btn{
 flex:1;
 height:64rpx;
 border-radius:999rpx;
 background:#EAF8F0;
 color:#0BA45A;
 font-size:24rpx;
 display:flex;
 align-items:center;
 justify-content:center;
}
</style>
