# 谱灵 AI CloudBase 数据库设计

## 1. 数据库类型

`cloudbase-native` 分支使用微信云开发云数据库。

该分支不使用 MySQL 和 Redis。

核心原则：

```text
小程序端 → 云函数 → 云数据库
```

MVP 阶段所有创建、更新、删除操作统一通过云函数处理，前端不直接写数据库。

## 2. 集合总览

| 集合 | 用途 | 主要写入方 |
|---|---|---|
| `users` | 用户资料、会员状态、AI 额度、社区统计 | `login`、`ai-generate`、`songs` |
| `songs` | AI 曲谱、手动曲谱、公开曲谱、私有草稿 | `songs`、`ai-generate` |
| `comments` | 曲谱评论和回复 | `comments` |
| `follows` | 用户关注关系 | `songs` |
| `favorites` | 用户收藏曲谱关系 | `interactions` |
| `likes` | 用户点赞曲谱关系 | `interactions` |
| `notifications` | 点赞、关注、评论、系统通知 | `notifications` |
| `practice_records` | 用户练习记录 | `songs` |
| `orders` | 会员套餐订单、mock 支付记录 | `orders` |

## 3. users

用途：用户资料、会员状态、AI 生成额度、社区统计。

核心字段：

| 字段 | 说明 |
|---|---|
| `_id` | 云数据库文档 ID |
| `openid` | 微信用户标识 |
| `nickname` | 昵称 |
| `avatar_url` | 头像 |
| `membership_type` | 会员类型，默认 `free` |
| `generation_quota` | 剩余 AI 生成次数 |
| `daily_free_quota` | 每日免费额度 |
| `total_generated` | 累计生成次数 |
| `works_count` | 作品数 |
| `followers_count` | 粉丝数 |
| `following_count` | 关注数 |
| `likes_count` | 获赞数 |
| `status` | 用户状态 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |
| `last_login_at` | 最后登录时间 |

建议索引：

```text
openid
status
created_at
```

## 4. songs

用途：AI 曲谱、手动曲谱、公开曲谱、私有草稿、练习统计。

核心字段：

| 字段 | 说明 |
|---|---|
| `_id` | 曲谱 ID |
| `user_openid` | 创建者 openid |
| `user_id` | 创建者用户文档 ID |
| `title` | 歌名 |
| `artist_name` | 歌手或来源 |
| `style` | 风格 |
| `song_key` | 调式 |
| `bpm` | 速度 |
| `capo` | 变调夹 |
| `difficulty` | 难度 |
| `strumming` | 扫弦节奏型 |
| `tags` | 标签 |
| `raw_text` | 原始曲谱文本 |
| `content_json` | 结构化曲谱 |
| `source_type` | `ai` 或 `user_upload` |
| `edit_mode` | `ai` 或 `manual` |
| `is_public` | 是否公开 |
| `visibility` | `public` 或 `private` |
| `audit_status` | 审核状态，如 `pending`、`private` |
| `favorite_count` | 收藏数 |
| `like_count` | 点赞数 |
| `comment_count` | 评论数 |
| `view_count` | 浏览数 |
| `practice_count` | 练习次数 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

建议索引：

```text
user_openid
user_id
is_public
created_at
like_count
favorite_count
view_count
practice_count
title
artist_name
difficulty
```

## 5. comments

用途：曲谱评论和回复。

核心字段：

| 字段 | 说明 |
|---|---|
| `_id` | 评论 ID |
| `song_id` | 曲谱 ID |
| `user_openid` | 评论者 openid |
| `user_id` | 评论者用户文档 ID |
| `nickname` | 评论者昵称快照 |
| `avatar_url` | 评论者头像快照 |
| `parent_id` | 父评论 ID，一级评论为空 |
| `content` | 评论内容 |
| `like_count` | 评论点赞数 |
| `status` | `visible` 或 `deleted` |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

建议索引：

```text
song_id
user_openid
created_at
status
```

## 6. follows

用途：用户关注关系。

核心字段：

| 字段 | 说明 |
|---|---|
| `_id` | 关系 ID |
| `follower_openid` | 关注者 openid |
| `follower_user_id` | 关注者用户 ID |
| `following_user_id` | 被关注者用户 ID |
| `created_at` | 创建时间 |

建议索引：

```text
follower_openid
follower_user_id
following_user_id
```

## 7. favorites

用途：用户收藏曲谱关系。

核心字段：

| 字段 | 说明 |
|---|---|
| `_id` | 收藏关系 ID |
| `user_openid` | 用户 openid |
| `song_id` | 曲谱 ID |
| `created_at` | 创建时间 |

建议索引：

```text
user_openid
song_id
created_at
```

## 8. likes

用途：用户点赞曲谱关系。

核心字段：

| 字段 | 说明 |
|---|---|
| `_id` | 点赞关系 ID |
| `user_openid` | 用户 openid |
| `song_id` | 曲谱 ID |
| `created_at` | 创建时间 |

建议索引：

```text
user_openid
song_id
created_at
```

## 9. notifications

用途：点赞、关注、评论、系统通知。

核心字段：

| 字段 | 说明 |
|---|---|
| `_id` | 通知 ID |
| `user_openid` | 接收者 openid |
| `type` | 通知类型，默认 `system` |
| `title` | 通知标题 |
| `content` | 通知内容 |
| `target_id` | 关联对象 ID |
| `is_read` | 是否已读 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

建议索引：

```text
user_openid
is_read
created_at
```

## 10. practice_records

用途：记录用户练习行为，用于练习历史和曲谱练习热度统计。

核心字段：

| 字段 | 说明 |
|---|---|
| `_id` | 练习记录 ID |
| `user_openid` | 用户 openid |
| `user_id` | 用户文档 ID |
| `song_id` | 曲谱 ID |
| `duration_seconds` | 练习时长 |
| `bpm` | 练习速度 |
| `scroll_speed` | 滚动速度 |
| `practiced_sections` | 已练习段落 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

建议索引：

```text
user_openid
user_id
song_id
created_at
```

## 11. orders

用途：会员套餐订单和 mock 支付记录。

当前 `orders` 云函数仅返回 mock 支付参数，不代表正式微信支付能力。

核心字段：

| 字段 | 说明 |
|---|---|
| `_id` | 订单文档 ID |
| `order_no` | 订单号 |
| `user_openid` | 用户 openid |
| `product_code` | 套餐编码，如 `vip_month` |
| `product_type` | 产品类型，如 `vip` |
| `amount` | 金额 |
| `payment_status` | 支付状态，默认 `pending` |
| `payment_method` | 支付方式，当前为 `wechat_pay_mock` |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

建议索引：

```text
user_openid
order_no
payment_status
created_at
```

## 12. 权限原则

MVP 阶段建议：

```text
公开曲谱：允许前端读取必要字段
用户私有数据：只允许云函数读写
写操作：统一通过云函数完成
管理操作：通过 CloudBase 控制台或管理云函数完成
```

推荐链路：

```text
小程序端
  ↓
云函数
  ↓
云数据库
```

不要在页面层直接写入集合，避免越权、重复逻辑和统计字段不一致。
