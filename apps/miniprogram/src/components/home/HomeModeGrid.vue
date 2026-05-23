<template>
<view class="mode-grid">
<view
v-for="item in items"
:key="item.value"
class="mode-item"
@tap="emit('select',item.value)"
>
<text class="mode-icon">{{item.icon}}</text>
<text class="mode-name">{{item.label}}</text>
</view>
</view>
</template>

<script setup lang="ts">
defineProps<{items:any[]}>()
const emit=defineEmits<{select:[value:string]}>()
</script>

<style scoped>
.mode-grid{
width:686rpx;
display:grid;
grid-template-columns:repeat(4,1fr);
gap:16rpx;
padding:0 32rpx;
box-sizing:border-box;
}
.mode-item{
height:132rpx;
background:#fff;
border-radius:24rpx;
border:1rpx solid #E8EFEA;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
}
.mode-icon{
font-size:42rpx;
margin-bottom:10rpx;
}
.mode-name{
font-size:22rpx;
color:#17231E;
}
</style>