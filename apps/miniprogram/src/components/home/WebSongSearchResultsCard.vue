<template>
  <view class="results-card">
    <view class="card-head">
      <view class="icon-box">⌕</view>
      <view class="head-main">
        <text class="eyebrow">{{ sourceLabel }}</text>
        <text class="title">找到可用曲谱资源</text>
      </view>
      <view class="count">{{ getTotalTabCount() }}条</view>
    </view>

    <view v-if="primaryCandidate" class="intent-card">
      <view class="intent-title">AI已识别</view>
      <view class="intent-row">
        <view class="intent-pill">歌名：{{ primaryCandidate.title }}</view>
        <view v-if="primaryCandidate.artist" class="intent-pill">歌手：{{ primaryCandidate.artist }}</view>
      </view>
      <view class="intent-row">
        <view class="intent-pill intent-pill--soft">偏好：{{ preferredLabel }}</view>
        <view v-if="preferredKey" class="intent-pill intent-pill--soft">调式：{{ preferredKey }}</view>
        <view class="intent-pill intent-pill--soft">难度：{{ difficultyLabel }}</view>
      </view>
    </view>

    <view class="flow-guide">
      <view class="guide-step active">1 选歌曲</view>
      <view class="guide-line" />
      <view class="guide-step">2 选类型</view>
      <view class="guide-line" />
      <view class="guide-step">3 生成曲谱</view>
    </view>

    <view v-if="previewableRefs.length" class="resource-section">
      <view class="section-label">图片谱 · 先看谱面</view>
      <view v-for="(ref, index) in previewableRefs" :key="`preview-${ref.url}-${index}`" class="ref-preview-item">
        <image v-if="ref.thumbnail_url" class="ref-thumb" :src="ref.thumbnail_url" mode="aspectFill" @tap="openImageResource(ref)" />
        <view v-else class="ref-thumb ref-thumb--empty" @tap="openImageResource(ref)">图</view>
        <view class="ref-main" @tap="openImageResource(ref)">
          <view class="ref-title-row">
            <text class="ref-title">{{ ref.title }}</text>
            <text class="type-pill type-pill--image">图片谱</text>
          </view>
          <text class="ref-snippet">{{ ref.snippet || '可预览图片谱' }}</text>
          <view class="ref-meta-row">
            <text class="ref-provider">{{ ref.source_site || ref.provider || 'web' }}</text>
            <text class="ref-score">{{ Math.round(ref.tab_score || 0) }}分</text>
          </view>
        </view>
        <view class="button-col">
          <view class="open-btn" @tap.stop="openImageResource(ref)">{{ openingUrl === getResourceKey(ref) ? '打开中' : '预览' }}</view>
        </view>
      </view>
    </view>

    <view v-if="importableRefs.length" class="resource-section">
      <view class="section-label">AI生成线索 · 可辅助编配</view>
      <view v-for="(ref, index) in importableRefs" :key="`import-${ref.url}-${index}`" class="ref-preview-item">
        <view class="ref-thumb ref-thumb--empty" @tap="emit('select', primaryCandidate)">谱</view>
        <view class="ref-main" @tap="emit('select', primaryCandidate)">
          <view class="ref-title-row">
            <text class="ref-title">{{ ref.title }}</text>
            <text class="type-pill type-pill--text">线索</text>
          </view>
          <text class="ref-snippet">{{ ref.snippet || '可作为AI生成TXT谱或图片六线谱的参考线索' }}</text>
          <view class="ref-meta-row">
            <text class="ref-provider">{{ ref.source_site || ref.provider || 'web' }}</text>
            <text class="ref-score">{{ Math.round(ref.tab_score || 0) }}分</text>
          </view>
        </view>
        <view class="button-col">
          <view class="import-btn" @tap.stop="emit('select', primaryCandidate)">生成</view>
        </view>
      </view>
    </view>

    <view v-if="viewOnlyRefs.length" class="resource-section resource-section--muted">
      <view class="section-label">参考结果 · 可打开查找</view>
      <view v-for="(ref, index) in viewOnlyRefs" :key="`view-${ref.url}-${index}`" class="ref-preview-item ref-preview-item--muted">
        <view class="ref-thumb ref-thumb--empty ref-thumb--muted" @tap="openReferenceResource(ref)">搜</view>
        <view class="ref-main" @tap="openReferenceResource(ref)">
          <view class="ref-title-row">
            <text class="ref-title">{{ ref.title }}</text>
            <text class="type-pill type-pill--fallback">参考</text>
          </view>
          <text class="ref-snippet">{{ ref.snippet || '该结果用于继续查找曲谱资源' }}</text>
          <view class="ref-meta-row">
            <text class="ref-provider">{{ ref.source_site || ref.provider || 'web' }}</text>
            <text class="ref-score">{{ getHostLabel(ref.url) }}</text>
          </view>
        </view>
        <view class="button-col">
          <view class="reference-btn" @tap.stop="openReferenceResource(ref)">{{ openingUrl === getResourceKey(ref) ? '处理中' : '打开' }}</view>
        </view>
      </view>
    </view>

    <view v-if="!allReferences.length" class="result-list">
      <view v-for="(item, index) in candidates.slice(0, 5)" :key="`${item.title}-${item.artist || ''}-${index}`" class="result-item result-item--candidate" @tap="emit('select', item)">
        <view class="rank">{{ index + 1 }}</view>
        <view class="song-main">
          <view class="song-title-row">
            <text class="song-title">{{ item.title }}</text>
            <text class="score">{{ getConfidenceText(item) }}</text>
          </view>
          <text v-if="item.artist" class="artist">{{ item.artist }}</text>
          <text class="summary">{{ item.summary || getFallbackSummary(item) }}</text>
        </view>
        <view class="choose-btn">选择</view>
      </view>
    </view>

    <view class="notice">{{ noticeText }}</view>

    <view class="actions">
      <view class="ghost-btn" @tap="emit('searchAgain')">重新搜索</view>
      <view v-if="FEATURES.ENABLE_AI_GENERATE" class="ghost-btn ghost-btn--ai" @tap="emit('select', candidates[0])">选择生成</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { previewResourceImage } from '@/api/resourcePreview'
import { FEATURES } from '@/config/features'
import type { ResourcePreviewResult } from '@/api/resourcePreview'
import type { WebSearchReference, WebSongCandidate } from '@/api/webSearch'

const props = withDefaults(defineProps<{ candidates: WebSongCandidate[]; sourceLabel?: string }>(), { sourceLabel: '网络吉他谱搜索' })
const emit = defineEmits<{ select: [candidate: WebSongCandidate]; searchAgain: [] }>()
const openingUrl = ref('')
const allReferences = computed(() => props.candidates.flatMap((item) => item.tabReferences || item.references || []).slice(0, 14))
const previewableRefs = computed(() => allReferences.value.filter((ref) => canPreviewImage(ref)).slice(0, 4))
const importableRefs = computed(() => allReferences.value.filter((ref) => canImportText(ref)).slice(0, 5))
const viewOnlyRefs = computed(() => allReferences.value.filter((ref) => !canPreviewImage(ref) && !canImportText(ref)).slice(0, 6))
const primaryCandidate = computed(() => props.candidates[0])
const preferredLabel = computed(() => {
  const type = primaryCandidate.value?.preferred_output_type || primaryCandidate.value?.arrangementHints?.outputPreference
  if (type === 'image') return '图片六线谱'
  if (type === 'txt') return 'TXT谱'
  return '可自行选择'
})
const preferredKey = computed(() => primaryCandidate.value?.arrangementHints?.possibleKeys?.[0] || '')
const difficultyLabel = computed(() => primaryCandidate.value?.arrangementHints?.difficulty || '新手')
const noticeText = computed(() => {
  if (previewableRefs.value.length && importableRefs.value.length) return '可以先预览图片谱，也可以选择歌曲后生成TXT谱或图片六线谱。'
  if (previewableRefs.value.length) return '当前结果以图片谱为主，可先预览，也可以直接生成应用内曲谱。'
  if (importableRefs.value.length) return '当前结果包含可用编配线索，建议选择歌曲后生成应用内曲谱。'
  return '当前展示的是曲谱搜索入口，可打开查找，也可以直接生成应用内曲谱。'
})
function getConfidenceText(candidate: WebSongCandidate) { return `${Math.round((candidate.confidence || 0) * 100)}%` }
function getTabCount(candidate: WebSongCandidate) { return Number(candidate.arrangementHints?.tabReferenceCount || candidate.tabReferences?.length || 0) }
function getTotalTabCount() { return props.candidates.reduce((sum, item) => sum + getTabCount(item), 0) || allReferences.value.length || props.candidates.length }
function getFallbackSummary(candidate: WebSongCandidate) { return candidate.artist ? `识别到《${candidate.title}》 - ${candidate.artist}` : `识别到《${candidate.title}》` }
function getResourceKey(ref: WebSearchReference) { return ref.image_url || ref.thumbnail_url || ref.url || ref.title || '' }
function getHostLabel(url = '') { try { return new URL(url).hostname.replace(/^www\./, '') } catch (_error) { return '网页' } }
function isImageSearchEntry(ref: WebSearchReference) { const title = String(ref.title || ''); const provider = String(ref.provider || ''); const url = String(ref.url || ''); return /图片谱|百度图片|image/i.test(title) || provider.includes('image') || /image\.baidu\.com/.test(url) }
function canPreviewImage(ref: WebSearchReference) { return FEATURES.ENABLE_IMAGE_PREVIEW && Boolean(ref.previewable === true || ref.action_hint === 'preview' || isImageSearchEntry(ref)) }
function canImportText(ref: WebSearchReference) { return ref.importable === true || ref.result_type === 'text' || ref.action_hint === 'import' }
function buildSearchQuery(ref: WebSearchReference) { const candidate = primaryCandidate.value; const parts = [candidate?.title, candidate?.artist, ref.title].filter(Boolean).join(' ').replace(/百度图片[:：]?|百度搜索[:：]?|Bing搜索[:：]?|搜索入口|曲谱站搜索|网页谱|图片谱|TXT谱|文本谱/g, ' ').replace(/\s+/g, ' ').trim(); return parts || ref.title || candidate?.title || '' }
function getImageSearchUrl(ref: WebSearchReference) { const query = `${buildSearchQuery(ref)} 吉他谱 图片谱`; return `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(query)}` }
function copyReferenceLink(url: string) { uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) }) }
function tryOpenInWebview(ref: WebSearchReference, url: string) { const encoded = encodeURIComponent(url); uni.navigateTo({ url: `/pages/resource-webview/index?url=${encoded}&title=${encodeURIComponent(ref.title || '曲谱资源')}`, fail: () => copyReferenceLink(url), complete: () => { setTimeout(() => { openingUrl.value = '' }, 500) } }) }
function openReferenceResource(ref: WebSearchReference) { const url = ref.url || ref.image_url || ref.thumbnail_url || ''; if (!url) { uni.showToast({ title: '资源链接为空', icon: 'none' }); return } openingUrl.value = getResourceKey(ref); uni.showActionSheet({ itemList: ['复制链接', '尝试打开网页'], success: (res) => { if (res.tapIndex === 0) { copyReferenceLink(url); openingUrl.value = ''; return } tryOpenInWebview(ref, url) }, fail: () => { openingUrl.value = '' } }) }
function showImagePreviewFallback(ref: WebSearchReference) { const searchUrl = getImageSearchUrl(ref); uni.showActionSheet({ itemList: ['重新尝试预览', '复制图片搜索链接', '打开图片搜索页'], success: (res) => { if (res.tapIndex === 0) { openImageResource(ref); return } if (res.tapIndex === 1) { copyReferenceLink(searchUrl); return } tryOpenInWebview({ ...ref, title: `${buildSearchQuery(ref)} 图片谱` }, searchUrl) }, fail: () => {}, complete: () => { openingUrl.value = '' } }) }
async function openImageResource(ref: WebSearchReference) {
  if (!canPreviewImage(ref)) return
  const key = getResourceKey(ref)
  if (!key) { uni.showToast({ title: '资源链接为空', icon: 'none' }); return }
  openingUrl.value = key
  try {
    uni.showLoading({ title: '打开图片谱' })
    const result = await previewResourceImage({ title: ref.title, url: ref.url, image_url: ref.image_url, thumbnail_url: ref.thumbnail_url, search_query: buildSearchQuery(ref) })
    await previewFromCloudResult(result, ref)
  } catch (_error: any) {
    uni.hideLoading()
    showImagePreviewFallback(ref)
  } finally {
    openingUrl.value = ''
  }
}
async function previewFromCloudResult(result: ResourcePreviewResult, ref: WebSearchReference) {
  const sourceUrl = result.sourceUrl || ref.url || ref.image_url || ref.thumbnail_url || ''
  // #ifdef MP-WEIXIN
  if (result.fileID && typeof wx !== 'undefined' && wx.cloud?.downloadFile) {
    try {
      const downloaded = await wx.cloud.downloadFile({ fileID: result.fileID })
      const tempFilePath = downloaded?.tempFilePath
      if (tempFilePath) {
        uni.hideLoading()
        uni.previewImage({ urls: [tempFilePath], current: tempFilePath, fail: () => previewByTempUrl(result.tempFileURL, sourceUrl, ref) })
        return
      }
    } catch (_error) {}
  }
  // #endif
  previewByTempUrl(result.tempFileURL, sourceUrl, ref)
}
function previewByTempUrl(tempFileURL: string, sourceUrl = '', ref?: WebSearchReference) {
  if (!tempFileURL) { uni.hideLoading(); if (sourceUrl) uni.setClipboardData({ data: sourceUrl }); if (ref) showImagePreviewFallback(ref); return }
  uni.hideLoading()
  uni.previewImage({ urls: [tempFileURL], current: tempFileURL, fail: () => { if (sourceUrl) uni.setClipboardData({ data: sourceUrl }); if (ref) showImagePreviewFallback(ref) } })
}
</script>

<style scoped>
.results-card { width: 686rpx; margin: 0 32rpx 24rpx; padding: 24rpx; box-sizing: border-box; border-radius: 28rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; box-shadow: 0 12rpx 34rpx rgba(18, 52, 36, 0.06); animation: cardIn .22s ease-out; }
.card-head { display: flex; align-items: center; }
.icon-box { width: 72rpx; height: 72rpx; margin-right: 18rpx; border-radius: 24rpx; background: #EAF8F0; color: #0BA45A; font-size: 36rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.head-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.eyebrow { color: #0BA45A; font-size: 22rpx; line-height: 28rpx; font-weight: 800; }
.title { margin-top: 6rpx; color: #17231E; font-size: 31rpx; line-height: 40rpx; font-weight: 900; }
.count { min-width: 72rpx; height: 48rpx; padding: 0 14rpx; border-radius: 999rpx; background: #F0FBF5; color: #0BA45A; font-size: 22rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.intent-card { margin-top: 20rpx; padding: 18rpx; border-radius: 22rpx; background: #F6FAF8; border: 1rpx solid #E8EFEA; }
.intent-title { color: #17231E; font-size: 24rpx; line-height: 32rpx; font-weight: 900; }
.intent-row { margin-top: 12rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.intent-pill { max-width: 100%; min-height: 42rpx; padding: 0 16rpx; border-radius: 999rpx; background: #EAF8F0; color: #0BA45A; display: flex; align-items: center; font-size: 22rpx; line-height: 30rpx; font-weight: 800; }
.intent-pill--soft { background: #FFFFFF; color: #5F6B65; border: 1rpx solid #E8EFEA; }
.flow-guide { margin-top: 18rpx; padding: 12rpx 14rpx; border-radius: 18rpx; background: #F6FAF8; display: flex; align-items: center; }
.guide-step { color: #7B8580; font-size: 20rpx; font-weight: 800; white-space: nowrap; }
.guide-step.active { color: #0BA45A; }
.guide-line { flex: 1; height: 2rpx; margin: 0 10rpx; background: #DDEAE3; }
.resource-section { margin-top: 20rpx; }
.resource-section--muted { opacity: .94; }
.section-label { margin-bottom: 10rpx; color: #17231E; font-size: 24rpx; line-height: 32rpx; font-weight: 900; }
.ref-preview-item, .result-item { margin-top: 12rpx; padding: 14rpx; border-radius: 20rpx; background: #FAFDFB; border: 1rpx solid #E8EFEA; display: flex; align-items: center; }
.ref-preview-item--muted { background: #F7F9F8; }
.ref-thumb { width: 92rpx; height: 92rpx; margin-right: 16rpx; border-radius: 16rpx; background: #EAF8F0; flex-shrink: 0; }
.ref-thumb--empty { color: #0BA45A; font-size: 28rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.ref-thumb--muted { color: #0BA45A; background: #EAF8F0; }
.ref-main, .song-main { flex: 1; min-width: 0; }
.ref-title-row, .song-title-row { display: flex; align-items: center; min-width: 0; }
.ref-title, .song-title { flex: 1; min-width: 0; color: #17231E; font-size: 24rpx; line-height: 32rpx; font-weight: 800; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.type-pill { height: 32rpx; margin-left: 10rpx; padding: 0 10rpx; border-radius: 999rpx; font-size: 18rpx; line-height: 32rpx; font-weight: 800; flex-shrink: 0; }
.type-pill--image { color: #B66D00; background: #FFF4DC; }
.type-pill--text { color: #0A7ACC; background: #E8F4FF; }
.type-pill--fallback, .type-pill--web { color: #7B8580; background: #EEF3F0; }
.ref-snippet, .artist, .summary { display: block; margin-top: 6rpx; color: #7B8580; font-size: 21rpx; line-height: 30rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ref-meta-row { margin-top: 8rpx; display: flex; gap: 10rpx; }
.ref-provider, .ref-score { color: #9AA49F; font-size: 19rpx; line-height: 24rpx; }
.button-col { width: 90rpx; margin-left: 12rpx; display: flex; flex-direction: column; gap: 10rpx; flex-shrink: 0; }
.open-btn, .import-btn, .choose-btn, .reference-btn { height: 46rpx; border-radius: 999rpx; color: #FFFFFF; font-size: 19rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.open-btn { background: #0BA45A; }
.import-btn { background: #17231E; }
.reference-btn { color: #0BA45A; background: #EAF8F0; border: 1rpx solid #D8F0E4; }
.choose-btn { width: 74rpx; margin-left: 12rpx; background: #0BA45A; flex-shrink: 0; }
.rank { width: 42rpx; height: 42rpx; margin-right: 16rpx; border-radius: 999rpx; background: #EAF8F0; color: #0BA45A; font-size: 22rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.score { margin-left: 10rpx; color: #0BA45A; font-size: 21rpx; font-weight: 800; flex-shrink: 0; }
.notice { margin-top: 18rpx; color: #A06A15; background: #FFF8E8; border-radius: 18rpx; padding: 14rpx 18rpx; font-size: 22rpx; line-height: 32rpx; }
.actions { margin-top: 22rpx; display: flex; gap: 14rpx; }
.ghost-btn { flex: 1; height: 68rpx; border-radius: 999rpx; background: #F6FAF8; color: #5F6B65; border: 1rpx solid #E8EFEA; display: flex; align-items: center; justify-content: center; font-size: 25rpx; font-weight: 800; }
.ghost-btn--ai { color: #0BA45A; background: #EAF8F0; border-color: #D8F0E4; }
@keyframes cardIn { from { opacity: 0; transform: translateY(12rpx); } to { opacity: 1; transform: translateY(0); } }
</style>