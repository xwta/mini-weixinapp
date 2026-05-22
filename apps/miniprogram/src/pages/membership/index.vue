<template>
  <view class="membership-page">
    <AppNavBar title="会员中心" subtitle="让灵感不断电" show-back />

    <view class="container">
      <view class="vip-hero">
        <view class="vip-title">谱灵 AI 会员</view>
        <view class="vip-desc">高级改编、导出图片、更多生成次数</view>
        <view class="vip-meta">当前权益：{{ auth.user?.membership_type === 'free' ? '免费用户' : '会员用户' }}</view>
      </view>

      <view class="section-title">选择套餐</view>

      <view v-if="products.length" class="product-list">
        <view
          v-for="product in products"
          :key="product.code"
          :class="['product-card', selectedCode === product.code && 'active']"
          @tap="selectedCode = product.code"
        >
          <view class="product-main">
            <view class="product-name">{{ product.name }}</view>
            <view class="product-desc">{{ product.description }}</view>
            <view class="benefits">
              <view v-for="benefit in product.benefits" :key="benefit" class="benefit">✓ {{ benefit }}</view>
            </view>
          </view>
          <view class="price">¥{{ product.amount }}</view>
        </view>
      </view>

      <EmptyState v-else icon="♬" title="套餐加载中" desc="正在整理会员权益" />

      <view class="buy-bar">
        <view class="buy-info">
          <view class="buy-label">当前选择</view>
          <view class="buy-name">{{ selectedProduct?.name || '请选择套餐' }}</view>
        </view>
        <view class="buy-btn" @tap="handleBuy">立即购买</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNavBar from '../../components/AppNavBar.vue'
import EmptyState from '../../components/EmptyState.vue'
import { loginWithWechatProfile } from '../../api/auth'
import { createOrder, getProducts, type Product } from '../../api/orders'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const products = ref<Product[]>([])
const selectedCode = ref('')

const selectedProduct = computed(() => products.value.find((item) => item.code === selectedCode.value))

onShow(() => {
  loadProducts()
})

async function loadProducts() {
  const list = await getProducts()
  products.value = list
  if (!selectedCode.value && list.length) {
    selectedCode.value = list[1]?.code || list[0].code
  }
}

async function ensureLogin() {
  if (auth.isLoggedIn) return
  await loginWithWechatProfile({ nickname: '谱灵用户' })
}

async function handleBuy() {
  if (!selectedCode.value) {
    uni.showToast({ title: '请选择套餐', icon: 'none' })
    return
  }
  await ensureLogin()
  const result = await createOrder(selectedCode.value)
  uni.showModal({
    title: '订单已创建',
    content: `订单号：${result.order.order_no}\n当前为支付 mock，微信支付待接入。`,
    showCancel: false,
  })
}
</script>

<style scoped lang="scss">
.membership-page {
  min-height: 100vh;
  background: #fafaf6;
  padding-bottom: 150rpx;
}

.vip-hero {
  padding: 42rpx;
  border-radius: 44rpx;
  background: #123c32;
  color: #fff;
  overflow: hidden;
}

.vip-title {
  color: #fff3cf;
  font-size: 46rpx;
  font-weight: 900;
}

.vip-desc {
  margin-top: 18rpx;
  color: #e8f7f0;
  font-size: 28rpx;
}

.vip-meta {
  margin-top: 30rpx;
  display: inline-flex;
  height: 58rpx;
  padding: 0 26rpx;
  border-radius: 29rpx;
  background: #fff3cf;
  color: #123c32;
  font-size: 24rpx;
  font-weight: 900;
  align-items: center;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.product-card {
  padding: 32rpx;
  border-radius: 36rpx;
  background: #fff;
  border: 4rpx solid transparent;
  display: flex;
  gap: 24rpx;
}

.product-card.active {
  border-color: #1e7a5a;
  background: #f8fffb;
}

.product-main {
  flex: 1;
}

.product-name {
  color: #123c32;
  font-size: 34rpx;
  font-weight: 900;
}

.product-desc {
  margin-top: 12rpx;
  color: #687078;
  font-size: 24rpx;
  line-height: 1.5;
}

.benefits {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.benefit {
  color: #1e7a5a;
  font-size: 24rpx;
  font-weight: 700;
}

.price {
  min-width: 120rpx;
  color: #1e7a5a;
  font-size: 38rpx;
  font-weight: 900;
  text-align: right;
}

.buy-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 34rpx;
  padding: 20rpx 22rpx;
  border-radius: 42rpx;
  background: #fff;
  box-shadow: 0 14rpx 44rpx rgba(18, 60, 50, 0.14);
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.buy-info {
  flex: 1;
}

.buy-label {
  color: #a0a7ae;
  font-size: 22rpx;
}

.buy-name {
  margin-top: 8rpx;
  color: #123c32;
  font-size: 28rpx;
  font-weight: 900;
}

.buy-btn {
  width: 210rpx;
  height: 82rpx;
  border-radius: 41rpx;
  background: #1e7a5a;
  color: #fff;
  font-size: 28rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
