# 谱灵 AI CloudBase API 文档

## 1. 调用方式

CloudBase 原生版不走 HTTP REST API，统一通过小程序云函数调用：

```ts
wx.cloud.callFunction({
  name: '函数名',
  data: {}
})
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

## 2. login 云函数

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
      "generation_quota": 10
    }
  }
}
```

## 3. songs 云函数

函数名：

```text
songs
```

### 3.1 搜索曲谱

请求：

```json
{
  "action": "search",
  "keyword": "晴天",
  "sort": "created_at",
  "page_size": 20
}
```

返回：

```json
{
  "code": 0,
  "data": {
    "items": [],
    "total": 0
  }
}
```

### 3.2 获取曲谱详情

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
    "title": "晴天",
    "content_json": {
      "sections": []
    }
  }
}
```

### 3.3 我的曲谱

请求：

```json
{
  "action": "mine",
  "page_size": 20
}
```

### 3.4 手动创建曲谱

请求：

```json
{
  "action": "manualCreate",
  "title": "我的歌",
  "artist_name": "原创",
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
    "title": "我的歌"
  }
}
```

## 4. ai-generate 云函数

函数名：

```text
ai-generate
```

用途：

```text
AI 写歌 / AI 配和弦 / 自动保存曲谱
```

请求：

```json
{
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
    "sections": []
  }
}
```

## 5. comments 云函数规划

函数名：

```text
comments
```

规划 action：

```text
list
create
remove
```

创建评论：

```json
{
  "action": "create",
  "song_id": "song_doc_id",
  "content": "这个和弦很好听"
}
```

## 6. notifications 云函数规划

函数名：

```text
notifications
```

规划 action：

```text
list
read
readAll
```

## 7. 错误码

```text
0      成功
400    参数错误
401    未登录
403    权限不足或额度不足
404    数据不存在
500    云函数内部错误
```
