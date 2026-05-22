# 谱灵 AI 小程序接口设计文档 V1.0

## 1. 接口基础约定

### Base URL

```text
https://api.example.com
```

### 认证方式

小程序端通过微信登录获取 code，后端换取 openid/session_key，并签发业务 token。

请求头：

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### 通用响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 常见错误码

| code | 含义 |
|---:|---|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录或 token 失效 |
| 403 | 无权限或次数不足 |
| 404 | 资源不存在 |
| 429 | 请求过快 |
| 500 | 服务异常 |
| 9001 | AI 生成失败 |
| 9002 | 内容疑似侵权或违规 |

## 2. 用户与登录

### 2.1 微信登录

```http
POST /api/auth/wechat-login
```

请求：

```json
{
  "code": "wx_login_code",
  "nickname": "用户昵称",
  "avatarUrl": "https://example.com/avatar.png"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": 1,
      "nickname": "用户昵称",
      "avatarUrl": "https://example.com/avatar.png",
      "membershipType": "free",
      "generationQuota": 3
    }
  }
}
```

### 2.2 获取当前用户信息

```http
GET /api/users/me
```

响应：

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "nickname": "用户昵称",
    "avatarUrl": "https://example.com/avatar.png",
    "membershipType": "free",
    "generationQuota": 3,
    "totalGenerated": 10
  }
}
```

## 3. AI 创作接口

### 3.1 AI 写歌

```http
POST /api/ai/songwriting
```

请求：

```json
{
  "prompt": "写一首关于毕业、夏天和遗憾的校园民谣",
  "style": "校园民谣",
  "difficulty": "新手",
  "key": "auto",
  "language": "中文"
}
```

响应：

```json
{
  "code": 0,
  "data": {
    "songId": 1001,
    "title": "夏天没说完的话",
    "style": "校园民谣",
    "key": "C",
    "bpm": 86,
    "capo": "2品",
    "difficulty": "新手",
    "strumming": "↓ ↓↑ ↑↓↑",
    "chords": ["C", "G", "Am", "F"],
    "sections": [
      {
        "name": "主歌",
        "lines": [
          {
            "chordLine": "C              G",
            "lyricLine": "操场边的风吹过了盛夏"
          }
        ]
      }
    ],
    "practiceTips": ["先慢速练习和弦转换"]
  }
}
```

### 3.2 AI 配和弦

```http
POST /api/ai/chords
```

请求：

```json
{
  "lyrics": "窗外的风吹过夏天\n你低头笑得很浅",
  "key": "auto",
  "difficulty": "新手",
  "rhythm": "auto"
}
```

响应结构同 AI 写歌接口。

### 3.3 AI 改编曲谱

```http
POST /api/ai/rewrite
```

请求：

```json
{
  "songId": 1001,
  "rewriteGoal": "改成更简单的新手版，只使用 C G Am F 四个和弦"
}
```

响应：

```json
{
  "code": 0,
  "data": {
    "songId": 1002,
    "sourceSongId": 1001,
    "title": "夏天没说完的话 - 新手版",
    "rewriteSummary": "降低了和弦复杂度，并统一为四和弦循环"
  }
}
```

### 3.4 生成分享文案

```http
POST /api/ai/share-copy
```

请求：

```json
{
  "songId": 1001,
  "platform": "xiaohongshu"
}
```

响应：

```json
{
  "code": 0,
  "data": {
    "title": "AI 写了一首关于毕业的歌",
    "content": "毕业那天没说出口的话，后来都变成了吉他里的和弦。",
    "tags": ["AI写歌", "吉他弹唱", "原创音乐"]
  }
}
```

## 4. 曲谱接口

### 4.1 获取曲谱详情

```http
GET /api/songs/{songId}
```

响应：

```json
{
  "code": 0,
  "data": {
    "id": 1001,
    "title": "夏天没说完的话",
    "style": "校园民谣",
    "key": "C",
    "bpm": 86,
    "capo": "2品",
    "difficulty": "新手",
    "contentJson": {},
    "isFavorite": true,
    "createdAt": "2026-05-23T00:00:00Z"
  }
}
```

### 4.2 我的作品列表

```http
GET /api/users/me/songs?page=1&pageSize=20
```

### 4.3 删除我的作品

```http
DELETE /api/songs/{songId}
```

### 4.4 搜索曲谱

```http
GET /api/songs/search?keyword=毕业&page=1&pageSize=20
```

## 5. 收藏接口

### 5.1 收藏曲谱

```http
POST /api/favorites
```

请求：

```json
{
  "songId": 1001
}
```

### 5.2 取消收藏

```http
DELETE /api/favorites/{songId}
```

### 5.3 我的收藏列表

```http
GET /api/favorites?page=1&pageSize=20
```

## 6. 练习接口

### 6.1 创建练习记录

```http
POST /api/practice-records
```

请求：

```json
{
  "songId": 1001,
  "durationSeconds": 600,
  "bpm": 86
}
```

### 6.2 最近练习

```http
GET /api/practice-records/recent
```

## 7. 订单与会员接口

### 7.1 获取套餐列表

```http
GET /api/products
```

### 7.2 创建订单

```http
POST /api/orders/create
```

请求：

```json
{
  "productId": "pack_20"
}
```

响应：

```json
{
  "code": 0,
  "data": {
    "orderNo": "ORDER202605230001",
    "paymentParams": {
      "timeStamp": "1710000000",
      "nonceStr": "abc",
      "package": "prepay_id=xxx",
      "signType": "RSA",
      "paySign": "xxx"
    }
  }
}
```

### 7.3 支付回调

```http
POST /api/payments/wechat/notify
```

## 8. 后台管理接口

### 8.1 用户列表

```http
GET /admin/users?page=1&pageSize=20
```

### 8.2 曲谱审核列表

```http
GET /admin/songs/audit?page=1&pageSize=20
```

### 8.3 更新审核状态

```http
PATCH /admin/songs/{songId}/audit
```

请求：

```json
{
  "auditStatus": "approved",
  "reason": "内容合规"
}
```

### 8.4 AI 生成记录

```http
GET /admin/ai-generation-logs?page=1&pageSize=20
```

## 9. 安全与限制

- AI 生成接口需要登录。
- 免费用户每日生成次数有限制。
- AI 生成前需要进行敏感词和版权风险检测。
- 用户公开内容需要审核。
- 支付回调必须验签。
- 管理后台接口需要管理员权限。
