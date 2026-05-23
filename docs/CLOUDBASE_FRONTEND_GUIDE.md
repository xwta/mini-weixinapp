# CloudBase 前端接入指南

## 1. 目标

`cloudbase-native` 分支的小程序前端通过云函数访问后端能力，不再直接请求 FastAPI HTTP 接口。

## 2. Provider 文件

入口文件：

```text
apps/miniprogram/src/api/provider.ts
```

当前策略：

```ts
const USE_CLOUDBASE = true
```

当 `USE_CLOUDBASE=true` 时：

```text
页面/业务 API
  ↓
provider.ts
  ↓
wx.cloud.callFunction
  ↓
云函数
```

## 3. 调用示例

```ts
import { request } from './provider'

const result = await request('songs', {
  action: 'search',
  keyword: '晴天'
})
```

## 4. 云函数命名

```text
login
songs
ai-generate
comments
notifications
```

## 5. 建议封装

业务层不要直接到处写 `wx.cloud.callFunction`。

推荐：

```text
api/provider.ts       通用调用层
api/cloudSongs.ts     曲谱业务封装
api/cloudAuth.ts      登录业务封装
api/cloudAi.ts        AI业务封装
```

## 6. 错误处理

云函数统一返回：

```json
{
  "code": 0,
  "data": {},
  "message": ""
}
```

前端建议：

```text
code = 0      正常返回
code = 401    跳转登录
code = 403    提示额度不足
code >= 500   提示服务繁忙
```

## 7. 环境切换

MVP 阶段直接使用：

```ts
const USE_CLOUDBASE = true
```

后续可改成：

```ts
const USE_CLOUDBASE = import.meta.env.VITE_API_PROVIDER === 'cloudbase'
```

## 8. 微信开发者工具配置

需要：

```text
开启云开发
绑定 CloudBase 环境
上传并部署云函数
确认云数据库集合存在
```
