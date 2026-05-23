<template>
  <view class="page">
    <AppNavbar title="我的订单" @back="goBack" />

    <view class="list">
      <view v-for="item in orders" :key="item.id" class="order-card">
        <view class="order-top">
          <view>
            <view class="order-title">{{ productName(item.product_code) }}</view>
            <view class="order-no">{{ item.order_no }}</view>
          </view>
          <view class="status">{{ statusText(item.payment_status) }}</view>
        </view>
        <view class="order-meta">
          <text>¥{{ item.amount }}</text>
          <text>{{ item.payment_method || 'wechat_pay_mock' }}</text>
        </view>
        <view class="mock-tip">当前为 mock 支付订单，仅用于前端流程调试。</view>
      </view>

      <view v-if="!orders.length && !loading" class="empty-card">
        <view class="empty-icon">◎</view>
        <view class="empty-title">暂无订单</view>
        <view class="empty-desc">开通会员后，订单会出现在这里。</view>
        <view class="empty-btn" @tap="goMembership">去会员中心</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavbar from '@/components/base/AppNavbar.vue'
import { getMyOrders, type Order } from '@/api/orders'
import { loginWithWechatProfile } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const orders = ref<Order[]>([])
const loading = ref(false)

onShow(loadOrders)

async function ensureLogin() {
  const auth = useAuthStore()
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

async function loadOrders() {
  loading.value = true
  try {
    await ensureLogin()
    const result = await getMyOrders(1, 50)
    orders.value = result.items || []
  } catch (error) {
    console.log('orders load failed', error)
    orders.value = []
  } finally {
    loading.value = false
  }
}

function productName(code: string) {
  const map: Record<string, string> = {
    vip_month: '月度会员',
    vip_quarter: '季度会员',
    vip_year: '年度会员',
  }
  return map[code] || code || '会员套餐'
}

function statusText(status: string) {
  const map: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    closed: '已关闭',
  }
  return map[status] || status || '未知'
}

function goMembership() {
  uni.navigateTo({ url: '/pages/membership/index' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { width: 750rpx; min-height: 100vh; background: #F6FBF8; padding-bottom: 48rpx; box-sizing: border-box; }
.list { padding: 24rpx 32rpx 0; box-sizing: border-box; }
.order-card { width: 686rpx; padding: 28rpx; margin-bottom: 20rpx; box-sizing: border-box; border-radius: 24rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; box-shadow: 0 8rpx 28rpx rgba(18,52,36,.06); }
.order-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.order-title { color: #17231E; font-size: 32rpx; font-weight: 800; }
.order-no { margin-top: 8rpx; color: #A4AEA8; font-size: 22rpx; }
.status { height: 52rpx; padding: 0 22rpx; border-radius: 999rpx; background: #F0FBF5; color: #0BA45A; display: flex; align-items: center; font-size: 23rpx; font-weight: 700; flex-shrink: 0; }
.order-meta { margin-top: 24rpx; display: flex; align-items: center; justify-content: space-between; color: #17231E; font-size: 28rpx; font-weight: 800; }
.mock-tip { margin-top: 18rpx; color: #6B756F; font-size: 23rpx; line-height: 34rpx; }
.empty-card { width: 686rpx; padding: 72rpx 32rpx; border-radius: 28rpx; background: #FFFFFF; border: 1rpx solid #E8EFEA; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
.empty-icon { width: 96rpx; height: 96rpx; border-radius: 32rpx; background: #EAF8F0; color: #0BA45A; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 800; }
.empty-title { margin-top: 24rpx; color: #17231E; font-size: 30rpx; font-weight: 800; }
.empty-desc { margin-top: 10rpx; color: #6B756F; font-size: 24rpx; text-align: center; }
.empty-btn { margin-top: 28rpx; height: 64rpx; padding: 0 30rpx; border-radius: 999rpx; background: #0BA45A; color: #FFFFFF; display: flex; align-items: center; font-size: 25rpx; font-weight: 800; }
</style>
