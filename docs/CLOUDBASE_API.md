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

用途：微信登录 / 自动注册 / 更新最后登录时间。

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

### 4.3 我的曲谱

```json
{
  "action": "mine",
  "page": 1,
  "page_size": 20
}
```

### 4.4 手动创建曲谱

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

### 4.5 发布曲谱

```json
{
  "action": "publish",
  "id": "song_doc_id"
}
```

### 4.6 删除曲谱

```json
{
  "action": "remove",
  "id": "song_doc_id"
}
```

### 4.7 用户主页

```json
{
  "action": "userProfile",
  "user_id": "user_doc_id"
}
```

### 4.8 用户公开曲谱

```json
{
  "action": "userSongs",
  "user_id": "user_doc_id",
  "page": 1,
  "page_size": 20
}
```

### 4.9 关注 / 取消关注

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

```json
{
  "action": "practiceRecent",
  "page": 1,
  "page_size": 20
}
```

## 5. web-search 云函数

函数名：

```text
web-search
```

用途：本地曲库搜不到时，联网识别歌曲候选。默认不需要 API Key。

默认搜索源：

```text
MusicBrainz
 iTunes Search
```

可选增强搜索源：

```text
Tavily
Brave Search
```

### 5.1 歌曲候选识别

请求：

```json
{
  "action": "songLookup",
  "keyword": "晴天 周杰伦"
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "query": "晴天 周杰伦",
    "canGenerate": true,
    "provider": "open",
    "notice": "搜索结果仅用于识别歌曲与生成 AI 简化弹唱编配，不复制第三方完整歌词或曲谱。",
    "candidates": [
      {
        "title": "晴天",
        "artist": "周杰伦",
        "album": "叶惠美",
        "duration": 269000,
        "confidence": 0.86,
        "source": "musicbrainz+itunes",
        "summary": "识别到歌曲信息，可生成 AI 简化弹唱编配版。",
        "references": [
          {
            "title": "iTunes：晴天 - 周杰伦",
            "url": "https://...",
            "snippet": "专辑：叶惠美"
          }
        ]
      }
    ]
  }
}
```

### 5.2 环境变量

默认无需配置 Key。建议配置：

```text
MUSICBRAINZ_USER_AGENT=PulingAI/1.0 (your-email@example.com)
```

可选增强：

```text
WEB_SEARCH_PROVIDER=open   # 默认，仅 MusicBrainz + iTunes
WEB_SEARCH_PROVIDER=auto   # 开放元数据 + Tavily / Brave 增强
TAVILY_API_KEY=xxx
BRAVE_SEARCH_API_KEY=xxx
```

### 5.3 版权边界

`web-search` 只保存歌曲元数据、链接和摘要，不保存完整歌词或第三方现成吉他谱。

## 6. ai-generate 云函数

函数名：

```text
ai-generate
```

用途：AI 写歌 / AI 配和弦 / 联网候选生成简化弹唱谱 / 自动保存曲谱 / 扣减生成额度。

### 6.1 AI 写歌

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

### 6.2 歌词配和弦

```json
{
  "type": "chords",
  "lyrics": "今天的风吹过操场",
  "song_key": "C",
  "difficulty": "新手",
  "rhythm": "流行扫弦"
}
```

### 6.3 联网歌曲候选生成 AI 简化弹唱版

```json
{
  "type": "web_chords",
  "title": "晴天",
  "artist": "周杰伦",
  "song_key": "C",
  "difficulty": "新手",
  "web_context": {
    "title": "晴天",
    "artist": "周杰伦",
    "album": "叶惠美",
    "confidence": 0.86,
    "source": "musicbrainz+itunes",
    "summary": "识别到歌曲信息，可生成 AI 简化弹唱编配版。",
    "references": []
  }
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "songId": "song_doc_id",
    "title": "晴天 AI简化弹唱版",
    "style": "民谣",
    "song_key": "C",
    "bpm": 86,
    "capo": "0品",
    "difficulty": "新手",
    "strumming": "下 下上 上下上",
    "chords": ["C", "G", "Am", "F"],
    "sections": [],
    "practiceTips": [],
    "source_type": "ai_web",
    "user": {
      "generation_quota": 9,
      "total_generated": 1,
      "works_count": 1,
      "membership_type": "free"
    }
  }
}
```

说明：

```text
web_chords 生成结果默认 private
audit_status 默认 private
source_type = ai_web
generation_source.type = web_search
```

## 7. ai-image 云函数

函数名：

```text
ai-image
```

用途：根据提示词生成图片 URL。

```json
{
  "prompt": "温暖治愈的民谣吉他封面，夕阳，手绘质感",
  "model": "hunyuan-image-v3.0-v1.0.4"
}
```

## 8. comments 云函数

函数名：

```text
comments
```

### 8.1 评论列表

```json
{
  "action": "list",
  "song_id": "song_doc_id",
  "page_size": 50
}
```

### 8.2 创建评论

```json
{
  "action": "create",
  "song_id": "song_doc_id",
  "content": "这个和弦很好听",
  "parent_id": null
}
```

### 8.3 删除评论

```json
{
  "action": "remove",
  "id": "comment_doc_id"
}
```

## 9. notifications 云函数

函数名：

```text
notifications
```

```json
{
  "action": "list",
  "page_size": 50
}
```

```json
{
  "action": "unreadCount"
}
```

```json
{
  "action": "read",
  "id": "notification_doc_id"
}
```

```json
{
  "action": "readAll"
}
```

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

## 10. interactions 云函数

函数名：

```text
interactions
```

```json
{
  "action": "toggleLike",
  "song_id": "song_doc_id"
}
```

```json
{
  "action": "toggleFavorite",
  "song_id": "song_doc_id"
}
```

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

```json
{
  "action": "listFavorites",
  "page": 1,
  "page_size": 20
}
```

```json
{
  "action": "listLiked",
  "page": 1,
  "page_size": 20
}
```

## 11. discovery 云函数

函数名：

```text
discovery
```

```json
{
  "action": "home"
}
```

```json
{
  "action": "hot",
  "page_size": 10
}
```

```json
{
  "action": "recommend",
  "page_size": 10
}
```

```json
{
  "action": "keywords"
}
```

## 12. orders 云函数

函数名：

```text
orders
```

注意：当前为 mock 支付链路，仅用于前端调试和会员流程占位。

```json
{
  "action": "products"
}
```

```json
{
  "action": "create",
  "product_code": "vip_month"
}
```

```json
{
  "action": "mine",
  "page": 1,
  "page_size": 20
}
```

## 13. 前端调用示例

```ts
import { searchWebSong } from './webSearch'
import { createWebChords } from './ai'

const web = await searchWebSong('晴天 周杰伦')
const candidate = web.candidates[0]

const song = await createWebChords({
  title: candidate.title,
  artist: candidate.artist,
  key: 'C',
  difficulty: '新手',
  web_context: candidate,
})
```

新增接口时，优先在 `src/api/*.ts` 中封装，不要在页面中直接写 `wx.cloud.callFunction`。
