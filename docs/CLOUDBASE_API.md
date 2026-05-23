# 谱灵 AI CloudBase API 文档

## 1. 调用方式

CloudBase 原生版不走 HTTP REST API，统一通过小程序云函数调用：

```ts
wx.cloud.callFunction({
  name: '函数名',
  data: {}
})
```

前端统一封装入口：

```text
apps/miniprogram/src/api/provider.ts
```

页面推荐调用链：

```text
page.vue
  ↓
src/api/*.ts
  ↓
provider.ts
  ↓
wx.cloud.callFunction
```

统一返回结构：

```json
{
  "code": 0,
  "data": {},
  "message": ""
}
```

错误示例：

```json
{
  "code": 401,
  "message": "请先登录"
}
```

## 2. 错误码

```text
0      成功
400    参数错误
401    未登录
403    权限不足、额度不足或内容审核不通过
404    数据不存在
500    云函数内部错误
```

## 3. login 云函数

函数名：

```text
login
```

用途：

```text
微信登录 / 自动注册 / 更新最后登录时间
```

请求：

```json
{
  "nickname": "谱灵用户",
  "avatar_url": ""
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "token": "openid",
    "user": {
      "_id": "xxx",
      "openid": "xxx",
      "nickname": "谱灵用户",
      "membership_type": "free",
      "generation_quota": 10,
      "daily_free_quota": 5,
      "total_generated": 0
    }
  }
}
```

## 4. songs 云函数

函数名：

```text
songs
```

### 4.1 搜索曲谱

请求：

```json
{
  "action": "search",
  "keyword": "晴天",
  "difficulty": "新手",
  "sort": "created_at",
  "page": 1,
  "page_size": 20
}
```

`sort` 支持：

```text
created_at
likes
favorites
views
```

返回：

```json
{
  "code": 0,
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "page_size": 20
  }
}
```

### 4.2 获取曲谱详情

请求：

```json
{
  "action": "detail",
  "id": "song_doc_id"
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "_id": "song_doc_id",
    "id": "song_doc_id",
    "title": "晴天",
    "content_json": {
      "sections": []
    },
    "view_count": 1
  }
}
```

### 4.3 我的曲谱

请求：

```json
{
  "action": "mine",
  "page": 1,
  "page_size": 20
}
```

### 4.4 手动创建曲谱

请求：

```json
{
  "action": "manualCreate",
  "title": "我的歌",
  "artist_name": "原创",
  "style": "弹唱",
  "song_key": "C",
  "difficulty": "新手",
  "raw_text": "[主歌]\nC G\n今天的风很轻",
  "is_public": false
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "_id": "song_doc_id",
    "id": "song_doc_id",
    "title": "我的歌",
    "source_type": "user_upload",
    "edit_mode": "manual"
  }
}
```

### 4.5 发布曲谱

请求：

```json
{
  "action": "publish",
  "id": "song_doc_id"
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "published": true
  }
}
```

### 4.6 删除曲谱

请求：

```json
{
  "action": "remove",
  "id": "song_doc_id"
}
```

### 4.7 用户主页

请求：

```json
{
  "action": "userProfile",
  "user_id": "user_doc_id"
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "user": {
      "id": "user_doc_id",
      "nickname": "谱友"
    },
    "stats": {
      "works_count": 0,
      "likes_count": 0,
      "followers_count": 0,
      "following_count": 0
    }
  }
}
```

### 4.8 用户公开曲谱

请求：

```json
{
  "action": "userSongs",
  "user_id": "user_doc_id",
  "page": 1,
  "page_size": 20
}
```

### 4.9 关注 / 取消关注

请求：

```json
{
  "action": "follow",
  "user_id": "target_user_doc_id"
}
```

```json
{
  "action": "unfollow",
  "user_id": "target_user_doc_id"
}
```

### 4.10 创建练习记录

请求：

```json
{
  "action": "practiceCreate",
  "song_id": "song_doc_id",
  "duration_seconds": 180,
  "bpm": 80,
  "scroll_speed": 1,
  "practiced_sections": {
    "verse": true
  }
}
```

### 4.11 最近练习记录

请求：

```json
{
  "action": "practiceRecent",
  "page": 1,
  "page_size": 20
}
```

## 5. ai-generate 云函数

函数名：

```text
ai-generate
```

用途：

```text
AI 写歌 / AI 配和弦 / 自动保存曲谱 / 扣减生成额度
```

### 5.1 AI 写歌

请求：

```json
{
  "type": "songwriting",
  "prompt": "写一首关于毕业和夏天的校园民谣",
  "style": "民谣",
  "difficulty": "新手",
  "song_key": "C",
  "is_public": false
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "songId": "song_doc_id",
    "title": "AI原创弹唱歌",
    "style": "民谣",
    "song_key": "C",
    "bpm": 86,
    "capo": "0品",
    "difficulty": "新手",
    "strumming": "下 下上 上下上",
    "chords": ["C", "G", "Am", "F"],
    "sections": [],
    "practiceTips": [],
    "user": {
      "generation_quota": 9,
      "total_generated": 1,
      "works_count": 1,
      "membership_type": "free"
    }
  }
}
```

### 5.2 歌词配和弦

请求：

```json
{
  "type": "chords",
  "lyrics": "今天的风吹过操场",
  "song_key": "C",
  "difficulty": "新手",
  "rhythm": "流行扫弦"
}
```

## 6. ai-image 云函数

函数名：

```text
ai-image
```

用途：

```text
根据提示词生成图片 URL
```

请求：

```json
{
  "prompt": "温暖治愈的民谣吉他封面，夕阳，手绘质感",
  "model": "hunyuan-image-v3.0-v1.0.4"
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "imageUrl": "https://...",
    "raw": {}
  }
}
```

## 7. comments 云函数

函数名：

```text
comments
```

### 7.1 评论列表

请求：

```json
{
  "action": "list",
  "song_id": "song_doc_id",
  "page_size": 50
}
```

### 7.2 创建评论

请求：

```json
{
  "action": "create",
  "song_id": "song_doc_id",
  "content": "这个和弦很好听",
  "parent_id": null
}
```

### 7.3 删除评论

请求：

```json
{
  "action": "remove",
  "id": "comment_doc_id"
}
```

## 8. notifications 云函数

函数名：

```text
notifications
```

### 8.1 消息列表

```json
{
  "action": "list",
  "page_size": 50
}
```

### 8.2 未读数量

```json
{
  "action": "unreadCount"
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "count": 3
  }
}
```

### 8.3 标记已读

```json
{
  "action": "read",
  "id": "notification_doc_id"
}
```

### 8.4 全部已读

```json
{
  "action": "readAll"
}
```

### 8.5 创建通知

```json
{
  "action": "create",
  "user_openid": "target_openid",
  "type": "system",
  "title": "系统通知",
  "content": "欢迎使用谱灵 AI",
  "target_id": ""
}
```

## 9. interactions 云函数

函数名：

```text
interactions
```

### 9.1 切换点赞

```json
{
  "action": "toggleLike",
  "song_id": "song_doc_id"
}
```

### 9.2 切换收藏

```json
{
  "action": "toggleFavorite",
  "song_id": "song_doc_id"
}
```

### 9.3 点赞 / 取消点赞

```json
{
  "action": "likeSong",
  "song_id": "song_doc_id"
}
```

```json
{
  "action": "unlikeSong",
  "song_id": "song_doc_id"
}
```

### 9.4 收藏 / 取消收藏

```json
{
  "action": "addFavorite",
  "song_id": "song_doc_id"
}
```

```json
{
  "action": "removeFavorite",
  "song_id": "song_doc_id"
}
```

### 9.5 收藏列表

```json
{
  "action": "listFavorites",
  "page": 1,
  "page_size": 20
}
```

### 9.6 点赞列表

```json
{
  "action": "listLiked",
  "page": 1,
  "page_size": 20
}
```

## 10. discovery 云函数

函数名：

```text
discovery
```

### 10.1 首页聚合

```json
{
  "action": "home"
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "keywords": ["晴天", "成都", "周杰伦"],
    "hot": [],
    "recommend": []
  }
}
```

### 10.2 热门曲谱

```json
{
  "action": "hot",
  "page_size": 10
}
```

### 10.3 推荐曲谱

```json
{
  "action": "recommend",
  "page_size": 10
}
```

### 10.4 热搜关键词

```json
{
  "action": "keywords"
}
```

## 11. orders 云函数

函数名：

```text
orders
```

注意：当前为 mock 支付链路，仅用于前端调试和会员流程占位。

### 11.1 会员套餐列表

```json
{
  "action": "products"
}
```

返回：

```json
{
  "code": 0,
  "data": [
    {
      "code": "vip_month",
      "name": "月度会员",
      "product_type": "vip",
      "amount": 29
    }
  ]
}
```

### 11.2 创建订单

```json
{
  "action": "create",
  "product_code": "vip_month"
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "order": {
      "id": "order_doc_id",
      "order_no": "PL...",
      "payment_status": "pending"
    },
    "payment_params": {
      "mode": "mock",
      "order_no": "PL..."
    }
  }
}
```

### 11.3 我的订单

```json
{
  "action": "mine",
  "page": 1,
  "page_size": 20
}
```

## 12. 前端调用示例

```ts
import { request } from './provider'

export async function toggleFavorite(songId: string) {
  return request('interactions', {
    action: 'toggleFavorite',
    song_id: songId,
  })
}
```

新增接口时，优先在 `src/api/*.ts` 中封装，不要在页面中直接写 `wx.cloud.callFunction`。
