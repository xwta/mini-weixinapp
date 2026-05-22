<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useAuthStore } from './stores/auth'

onLaunch(() => {
  const auth = useAuthStore()
  auth.restore()
})

onShow(() => {})
onHide(() => {})
</script>

<style lang="scss">
page {
  min-height: 100%;
  background: #fafaf6;
  color: #1f2428;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

view,
text,
button,
input,
textarea {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  line-height: 1;
}

button::after {
  border: none;
}
</style>
