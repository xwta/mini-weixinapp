# CloudBase 前端接入指南

## 1. 目标

`cloudbase-native` 分支的小程序前端通过云函数访问后端能力，不再直接请求 FastAPI HTTP 接口。

## 2. Provider 文件

入口文件：

```text
apps/miniprogram/src/api/provider.ts
```

当前策略：

```text
USE_CLOUDBASE = true
```

调用链路：

```text
页面
  ↓
业务 API 模块
  ↓
provider.ts
  ↓
wx.cloud.callFunction
  ↓
云函数
```

## 3. 已接入模块

```text
Songs API        已接入
Comments API     已接入
Discovery API    已接入
AI API           已接入
```

## 4. 待接入模块

```text
Notifications API
Interactions API
Auth API
```

## 5. 页面关系

```text
首页
  ↓
Discovery API
  ↓
discovery 云函数

搜谱页 / 曲谱详情页
  ↓
Songs API
  ↓
songs 云函数

曲谱详情评论区
  ↓
Comments API
  ↓
comments 云函数

创作页
  ↓
AI API
  ↓
ai-generate 云函数

消息中心
  ↓
Notifications API
  ↓
notifications 云函数

点赞收藏
  ↓
Interactions API
  ↓
interactions 云函数
```

## 6. 封装原则

页面不直接调用 `wx.cloud.callFunction`。

推荐链路：

```text
page.vue
  ↓
api/*.ts
  ↓
api/provider.ts
```

## 7. 错误处理

```text
code = 0      正常返回
code = 401    跳转登录
code = 403    提示额度不足
code >= 500   提示服务繁忙
```

## 8. 环境切换

MVP 阶段固定使用 CloudBase。

后续可改为环境变量控制：

```text
VITE_API_PROVIDER=cloudbase
```

## 9. 微信开发者工具配置

```text
开启云开发
绑定 CloudBase 环境
上传并部署云函数
确认云数据库集合存在
确认小程序端已初始化 wx.cloud
```
