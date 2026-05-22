# 谱灵 AI 小程序接口设计文档 V1.1

本文档与当前 `apps/server` FastAPI 后端实现保持同步。

## 1. 接口基础约定

### 1.1 本地开发地址

```text
http://127.0.0.1:8000
```

健康检查：

```http
GET /health
```

Swagger 文档：

```text
http://127.0.0.1:8000/docs
```

### 1.2 API 前缀

当前后端统一接口前缀：

```text
/api/v1
```

示例：

```http
POST /api/v1/auth/wechat-login
```

### 1.3 认证方式

除登录、公开搜索、曲谱详情外，大部分接口需要 JWT Token。

请求头：

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### 1.4 通用响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 1.5 分页响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "items": []
  }
}
```

### 1.6 常见 HTTP 状态码

| 状态码 | 含义 |
|---:|---|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录或 token 失效 |
| 403 | 无权限或生成次数不足 |
| 404 | 资源不存在 |
| 500 | 服务异常 |

## 2. 认证与用户接口

## 2.1 微信登录

当前 MVP 为 mock 登录：开发环境下使用 `code` 生成模拟 openid。生产环境需要替换为微信 `jscode2session`。

```http
POST /api/v1/auth/wechat-login
```

是否需要登录：否

请求体：

```json
{
  "code": "wx_login_code",
  "nickname": "用户昵称",
  "avatar_url": "https://example.com/avatar.png"
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
      "avatar_url": "https://example.com/avatar.png",
      "membership_type": "free",
      "generation_quota": 3,
      "daily_free_quota": 3,
      "total_generated": 0,
      "created_at": "2026-05-23T00:00:00"
    }
  }
}
```

字段说明：

| 字段 | 说明 |
|---|---|
| token | 后续接口鉴权用 JWT |
| generation_quota | 用户当前剩余 AI 生成次数 |
| total_generated | 累计生成次数 |

## 2.2 管理员登录

```http
POST /api/v1/auth/admin-login?username=admin&password=admin123456
```

是否需要登录：否

说明：当前实现使用 Query 参数传递账号密码，后续建议改为 JSON Body。

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "admin_jwt_token"
  }
}
```

## 2.3 获取当前用户信息

```http
GET /api/v1/users/me
```

是否需要登录：是

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "nickname": "用户昵称",
    "avatar_url": "https://example.com/avatar.png",
    "membership_type": "free",
    "generation_quota": 2,
    "daily_free_quota": 3,
    "total_generated": 1,
    "created_at": "2026-05-23T00:00:00"
  }
}
```

## 3. AI 创作接口

AI 创作接口当前为 mock provider，可在无真实 AI Key 的情况下跑通前后端联调。调用成功后会自动：

```text
生成曲谱 → 保存 songs → 写入 ai_generation_logs → 扣减 generation_quota → 返回 songId
```

## 3.1 AI 写歌

```http
POST /api/v1/ai/songwriting
```

是否需要登录：是

请求体：

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
  "message": "success",
  "data": {
    "songId": 1001,
    "title": "夏天没说完的话",
    "style": "校园民谣",
    "key": "C",
    "bpm": 86,
    "capo": "2品",
    "difficulty": "新手",
    "strumming": "↓ ↓↑ ↑↓↑",
    "chords": ["C", "G", "Am", "F", "Em"],
    "sections": [
      {
        "name": "主歌",
        "lines": [
          {
            "chordLine": "C              G",
            "lyricLine": "操场边的风吹过了盛夏"
          },
          {
            "chordLine": "Am             F",
            "lyricLine": "你低头笑着没有回答"
          }
        ]
      },
      {
        "name": "副歌",
        "lines": [
          {
            "chordLine": "F              G",
            "lyricLine": "后来我们各自去了远方"
          }
        ]
      }
    ],
    "practiceTips": [
      "先慢速练习 C-G-Am-F 转换",
      "熟悉后加入完整扫弦节奏"
    ]
  }
}
```

可能错误：

| 状态码 | 说明 |
|---:|---|
| 401 | 未登录 |
| 403 | 生成次数不足 |

## 3.2 AI 配和弦

```http
POST /api/v1/ai/chords
```

是否需要登录：是

请求体：

```json
{
  "lyrics": "窗外的风吹过夏天\n你低头笑得很浅",
  "key": "auto",
  "difficulty": "新手",
  "rhythm": "auto"
}
```

响应结构同 AI 写歌接口。

## 3.3 暂未实现接口

以下接口已在产品规划中，但当前后端尚未实现：

```http
POST /api/v1/ai/rewrite
POST /api/v1/ai/share-copy
```

建议后续补充：

- AI 改编曲谱
- 小红书/视频号分享文案
- AI 前奏/间奏生成

## 4. 曲谱接口

## 4.1 我的作品列表

```http
GET /api/v1/songs/mine?page=1&page_size=20
```

是否需要登录：是

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 1,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": 1001,
        "title": "夏天没说完的话",
        "style": "校园民谣",
        "song_key": "C",
        "bpm": 86,
        "capo": "2品",
        "difficulty": "新手",
        "strumming": "↓ ↓↑ ↑↓↑",
        "chords_json": ["C", "G", "Am", "F"],
        "content_json": {},
        "source_type": "ai",
        "is_public": false,
        "audit_status": "pending",
        "favorite_count": 0,
        "view_count": 0,
        "created_at": "2026-05-23T00:00:00"
      }
    ]
  }
}
```

## 4.2 公开曲谱搜索

```http
GET /api/v1/songs/search?keyword=毕业&page=1&page_size=20
```

是否需要登录：否

说明：当前只返回 `is_public = true` 且 `audit_status = approved` 的曲谱。

响应结构同分页结构。

## 4.3 获取曲谱详情

```http
GET /api/v1/songs/{song_id}
```

是否需要登录：否

说明：访问后会自动增加 `view_count`。

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1001,
    "title": "夏天没说完的话",
    "style": "校园民谣",
    "song_key": "C",
    "bpm": 86,
    "capo": "2品",
    "difficulty": "新手",
    "strumming": "↓ ↓↑ ↑↓↑",
    "chords_json": ["C", "G", "Am", "F", "Em"],
    "content_json": {
      "sections": []
    },
    "source_type": "ai",
    "is_public": false,
    "audit_status": "pending",
    "favorite_count": 0,
    "view_count": 1,
    "created_at": "2026-05-23T00:00:00"
  }
}
```

## 4.4 创建曲谱/用户上传作品

```http
POST /api/v1/songs
```

是否需要登录：是

请求体：

```json
{
  "title": "我的原创小歌",
  "style": "民谣",
  "song_key": "C",
  "bpm": 86,
  "capo": "0品",
  "difficulty": "新手",
  "strumming": "↓ ↓↑ ↑↓↑",
  "chords": ["C", "G", "Am", "F"],
  "sections": [
    {
      "name": "主歌",
      "lines": [
        {
          "chordLine": "C              G",
          "lyricLine": "我写下第一句歌词"
        }
      ]
    }
  ],
  "is_public": false
}
```

响应：返回 `SongOut`。

## 4.5 删除我的作品

```http
DELETE /api/v1/songs/{song_id}
```

是否需要登录：是

说明：当前为软删除，会写入 `deleted_at`。

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "deleted": true
  }
}
```

## 5. 收藏接口

## 5.1 我的收藏列表

```http
GET /api/v1/favorites?page=1&page_size=20
```

是否需要登录：是

响应结构：分页曲谱列表。

## 5.2 收藏曲谱

```http
POST /api/v1/favorites?song_id=1001
```

是否需要登录：是

说明：当前实现通过 Query 参数传 `song_id`。

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "favorited": true
  }
}
```

## 5.3 取消收藏

```http
DELETE /api/v1/favorites/{song_id}
```

是否需要登录：是

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "favorited": false
  }
}
```

## 6. 管理后台接口

后台接口需要管理员 Token。

管理员登录：

```http
POST /api/v1/auth/admin-login?username=admin&password=admin123456
```

返回的 token 需要放到请求头：

```http
Authorization: Bearer <admin_token>
```

## 6.1 用户列表

```http
GET /api/v1/admin/users?page=1&page_size=20
```

响应：分页用户列表。

## 6.2 曲谱列表/审核列表

```http
GET /api/v1/admin/songs?page=1&page_size=20
GET /api/v1/admin/songs?page=1&page_size=20&audit_status=pending
```

响应：分页曲谱列表。

## 6.3 更新曲谱审核状态

```http
PATCH /api/v1/admin/songs/{song_id}/audit?audit_status=approved
```

可选审核状态：

```text
pending
approved
rejected
```

说明：

- `approved` 会将 `is_public` 设置为 `true`
- `rejected` 会将 `is_public` 设置为 `false`

响应：返回更新后的 `SongOut`。

## 6.4 AI 生成记录

```http
GET /api/v1/admin/ai-generation-logs?page=1&page_size=20
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 1,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": 1,
        "user_id": 1,
        "song_id": 1001,
        "generation_type": "songwriting",
        "status": "success",
        "model_name": "mock",
        "created_at": "2026-05-23T00:00:00"
      }
    ]
  }
}
```

## 6.5 订单列表

```http
GET /api/v1/admin/orders?page=1&page_size=20
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 1,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": 1,
        "user_id": 1,
        "order_no": "ORDER202605230001",
        "product_code": "pack_20",
        "amount": 9.9,
        "payment_status": "pending",
        "created_at": "2026-05-23T00:00:00"
      }
    ]
  }
}
```

## 7. 当前暂未实现的规划接口

以下接口仍在规划中，代码尚未实现：

### 7.1 练习记录

```http
POST /api/v1/practice-records
GET  /api/v1/practice-records/recent
```

### 7.2 商品与订单

```http
GET  /api/v1/products
POST /api/v1/orders/create
POST /api/v1/payments/wechat/notify
```

### 7.3 AI 扩展能力

```http
POST /api/v1/ai/rewrite
POST /api/v1/ai/share-copy
POST /api/v1/ai/intro
POST /api/v1/ai/bridge
```

## 8. 前端联调流程

### 8.1 登录拿 token

```http
POST /api/v1/auth/wechat-login
```

请求：

```json
{
  "code": "test_code_001",
  "nickname": "测试用户",
  "avatar_url": ""
}
```

拿到：

```text
Authorization: Bearer <token>
```

### 8.2 AI 写歌

```http
POST /api/v1/ai/songwriting
```

请求头：

```http
Authorization: Bearer <token>
```

请求体：

```json
{
  "prompt": "写一首关于毕业的校园民谣",
  "style": "校园民谣",
  "difficulty": "新手",
  "key": "auto",
  "language": "中文"
}
```

### 8.3 查看我的作品

```http
GET /api/v1/songs/mine?page=1&page_size=20
```

### 8.4 查看曲谱详情

```http
GET /api/v1/songs/{song_id}
```

## 9. 安全与后续优化

当前 MVP 已有：

- JWT 鉴权
- 用户生成次数限制
- 管理员 Token 鉴权
- 曲谱软删除
- AI 生成日志记录

后续建议补充：

- 微信 `jscode2session` 正式登录
- 管理员登录改为 JSON Body
- AI 内容安全检测
- 版权风险检测
- 请求频率限制
- 支付回调验签
- 操作审计日志
