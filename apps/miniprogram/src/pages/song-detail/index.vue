<template>
  <view class="detail-page">
    <AppNavBar title="曲谱详情" :subtitle="song?.title || 'AI 原创弹唱谱'" show-back />

    <view v-if="song" class="container">
      <view class="title-row">
        <view class="title-main">
          <view class="song-title">{{ song.title }}</view>
          <view class="song-meta">{{ song.artist_name || '未知歌手' }} · {{ song.source_type === 'ai' ? 'AI 原创' : '用户作品' }} · {{ song.difficulty || '新手' }}</view>
          <view v-if="song.user_id" class="author-row" @tap="goUserProfile">
            <view class="author-avatar">谱</view><view class="author-name">作者主页</view><view class="follow-btn" @tap.stop="handleFollow">关注</view>
          </view>
        </view>
        <view class="favorite" @tap="handleFavorite">♡</view>
      </view>
      <view class="social-row"><view class="social-pill" @tap="handleLike">👍 {{ song.like_count || 0 }}</view><view class="social-pill">⭐ {{ song.favorite_count || 0 }}</view><view class="social-pill">👀 {{ song.view_count || 0 }}</view></view>
      <view class="info-card card"><view class="info-item"><text class="label">调式</text><text class="value">{{ song.song_key || 'C' }}</text></view><view class="info-item"><text class="label">BPM</text><text class="value">{{ song.bpm || 86 }}</text></view><view class="info-item"><text class="label">变调夹</text><text class="value">{{ song.capo || '0品' }}</text></view><view class="info-item"><text class="label">难度</text><text class="value green">{{ song.difficulty || '新手' }}</text></view></view>
      <view class="toolbar card"><view class="tool">升调</view><view class="tool">降调</view><view class="tool" @tap="startPractice">滚谱</view><view class="tool">节拍器</view></view>
      <view class="sheet card"><view v-for="section in sections" :key="section.name" class="section"><view class="section-name">{{ section.name }}</view><view v-for="(line, index) in section.lines" :key="index" class="line-block"><view v-if="line.chordLine" class="chord-line">{{ line.chordLine }}</view><view class="lyric-line">{{ line.lyricLine }}</view></view></view></view>
      <view class="tips card" v-if="practiceTips.length"><view class="tips-title">练习建议</view><view v-for="tip in practiceTips" :key="tip" class="tip">· {{ tip }}</view></view>
      <view class="comments card"><view class="comments-title">评论</view><view class="comment-input-row"><input v-model="commentText" class="comment-input" placeholder="说点关于这首谱的感受"/><view class="comment-send" @tap="submitComment">发送</view></view><view v-if="comments.length" class="comment-list"><view v-for="item in comments" :key="item.id" class="comment-item"><view class="comment-avatar">谱</view><view class="comment-main"><view class="comment-content">{{ item.content }}</view><view class="comment-meta">{{ item.like_count }} 赞</view></view></view></view><view v-else class="empty-comments">还没有评论，来当第一个拨片。</view></view>
      <view class="bottom-actions"><view class="secondary-btn" @tap="shareSong">分享</view><view class="primary-btn" @tap="startPractice">开始练习</view></view>
    </view>
    <EmptyState v-else icon="♪" title="曲谱加载中" desc="正在把谱子从琴盒里拿出来" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppNavBar from '../../components/AppNavBar.vue'
import EmptyState from '../../components/EmptyState.vue'
import { getSongDetail } from '../../api/songs'
import { addFavorite } from '../../api/favorites'
import { loginWithWechatProfile } from '../../api/auth'
import { followUser, likeSong } from '../../api/social'
import { createComment, getSongComments, type CommentItem } from '../../api/comments'
import { useAuthStore } from '../../stores/auth'
import type { Song, SongSection } from '../../types'

const song = ref<Song | null>(null)
const comments = ref<CommentItem[]>([])
const commentText = ref('')
const sections = computed<SongSection[]>(() => { const c=song.value?.content_json; if(c?.sections?.length)return c.sections; return [{name:'主歌',lines:[{chordLine:'C              G',lyricLine:'这里会显示歌词和和弦'},{chordLine:'Am             F',lyricLine:'生成后可以直接弹唱练习'}]}] })
const practiceTips = computed<string[]>(() => song.value?.content_json?.practiceTips || [])
onLoad(async (query) => { const id=Number(query?.id); if(id){ song.value=await getSongDetail(id); comments.value=await getSongComments(id) } })
async function ensureLogin(){ const auth=useAuthStore(); if(auth.isLoggedIn)return; await loginWithWechatProfile({nickname:'谱灵用户'}) }
async function handleFavorite(){ if(!song.value)return; await ensureLogin(); await addFavorite(song.value.id); song.value.favorite_count+=1; uni.showToast({title:'已收藏',icon:'success'}) }
async function handleLike(){ if(!song.value)return; await ensureLogin(); const res=await likeSong(song.value.id); song.value.like_count=res.like_count; uni.showToast({title:'已点赞',icon:'success'}) }
async function handleFollow(){ if(!song.value?.user_id)return; await ensureLogin(); await followUser(song.value.user_id); uni.showToast({title:'已关注作者',icon:'success'}) }
async function submitComment(){ if(!song.value||!commentText.value.trim())return; await ensureLogin(); const c=await createComment(song.value.id,commentText.value.trim()); comments.value.unshift(c); commentText.value=''; uni.showToast({title:'评论成功',icon:'success'}) }
function goUserProfile(){ if(song.value?.user_id)uni.navigateTo({url:`/pages/user-profile/index?id=${song.value.user_id}`}) }
function shareSong(){ uni.showToast({title:'分享海报功能开发中',icon:'none'}) }
function startPractice(){ if(song.value)uni.navigateTo({url:`/pages/practice/index?id=${song.value.id}`}) }
</script>

<style scoped lang="scss">
.detail-page{min-height:100vh;background:#fafaf6;padding-bottom:44rpx}.title-row{display:flex;justify-content:space-between;gap:24rpx}.title-main{flex:1;min-width:0}.song-title{color:#123c32;font-size:44rpx;font-weight:900;line-height:1.25}.song-meta{margin-top:12rpx;color:#687078;font-size:26rpx}.author-row{margin-top:22rpx;display:flex;align-items:center;gap:16rpx}.author-avatar{width:54rpx;height:54rpx;border-radius:27rpx;background:#e8f7f0;color:#1e7a5a;display:flex;align-items:center;justify-content:center;font-size:24rpx;font-weight:900}.author-name{color:#123c32;font-size:24rpx;font-weight:800}.follow-btn{margin-left:auto;height:52rpx;padding:0 24rpx;border-radius:26rpx;background:#1e7a5a;color:#fff;display:flex;align-items:center;font-size:24rpx;font-weight:900}.favorite{width:88rpx;height:88rpx;border-radius:44rpx;background:#e8f7f0;color:#1e7a5a;display:flex;align-items:center;justify-content:center;font-size:42rpx;font-weight:900}.social-row{margin-top:24rpx;display:flex;gap:16rpx}.social-pill{height:56rpx;padding:0 22rpx;border-radius:28rpx;background:#fff;color:#123c32;display:flex;align-items:center;font-size:24rpx;font-weight:800}.info-card{margin-top:30rpx;padding:26rpx;display:grid;grid-template-columns:repeat(4,1fr);gap:12rpx}.info-item{display:flex;flex-direction:column;gap:10rpx}.label{color:#687078;font-size:22rpx}.value{color:#123c32;font-size:34rpx;font-weight:900}.value.green{color:#1e7a5a;font-size:30rpx}.toolbar{margin-top:24rpx;height:96rpx;padding:0 16rpx;display:grid;grid-template-columns:repeat(4,1fr);align-items:center}.tool{color:#1e7a5a;font-size:26rpx;font-weight:900;text-align:center}.sheet{margin-top:28rpx;padding:36rpx}.section+.section{margin-top:46rpx}.section-name{color:#123c32;font-size:32rpx;font-weight:900;margin-bottom:28rpx}.line-block+.line-block{margin-top:28rpx}.chord-line{color:#1e7a5a;font-size:30rpx;font-weight:900;font-family:'Courier New',monospace;white-space:pre-wrap}.lyric-line{margin-top:8rpx;color:#1f2428;font-size:32rpx;line-height:1.7}.tips,.comments{margin-top:28rpx;padding:30rpx}.tips-title,.comments-title{color:#123c32;font-size:30rpx;font-weight:900}.tip{margin-top:16rpx;color:#687078;font-size:26rpx;line-height:1.5}.comment-input-row{margin-top:22rpx;display:flex;gap:16rpx}.comment-input{flex:1;height:72rpx;border-radius:36rpx;background:#fafaf6;padding:0 24rpx;font-size:26rpx}.comment-send{width:110rpx;height:72rpx;border-radius:36rpx;background:#1e7a5a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26rpx;font-weight:900}.comment-list{margin-top:24rpx}.comment-item{display:flex;gap:16rpx;padding:20rpx 0;border-bottom:1px solid #f1f2f3}.comment-avatar{width:48rpx;height:48rpx;border-radius:24rpx;background:#e8f7f0;color:#1e7a5a;display:flex;align-items:center;justify-content:center;font-size:22rpx;font-weight:900}.comment-main{flex:1}.comment-content{color:#123c32;font-size:26rpx;line-height:1.5}.comment-meta{margin-top:8rpx;color:#a0a7ae;font-size:22rpx}.empty-comments{margin-top:24rpx;color:#a0a7ae;font-size:24rpx}.bottom-actions{margin-top:32rpx;display:grid;grid-template-columns:1fr 1fr;gap:24rpx}
</style>
