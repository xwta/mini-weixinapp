# 谱灵 AI 产品 V2 优化方案

## 1. 产品方向

谱灵 AI 从单一 AI 自动生成吉他谱工具，升级为：

```text
吉他谱搜索 + 手动创建吉他谱 + AI 辅助创作 + 看谱练习 + 社交互动的小程序。
```

AI 是增强能力，不替代传统搜谱、手动建谱和社区沉淀。

## 2. V2 核心功能

必须保留并强化：

1. 搜索歌曲吉他谱。
2. 用户手动创建吉他谱。
3. AI 生成 / 配和弦 / 改编吉他谱。
4. 点赞、收藏、关注。
5. 用户主页和作品列表。
6. 看谱练习与练习记录。

## 3. 产品结构优化

MVP TabBar 保持 4 个：

```text
首页 / 搜谱 / 创作 / 我的
```

后续可扩展为：

```text
首页 / 搜谱 / 创作 / 关注 / 我的
```

## 4. 首页优化

首页从 AI 工具首页调整为曲谱社区首页。

模块顺序：

1. 搜索框：搜索歌曲 / 歌手 / 吉他谱。
2. 快捷入口：搜谱、手动创建、AI 生成、最近练习。
3. 热门吉他谱。
4. 新手友好谱。
5. AI 原创推荐。
6. 关注更新，登录后展示。

## 5. 搜谱页

搜索能力支持：

- 歌名
- 歌手
- 作者
- 风格
- 标签
- AI 谱 / 用户谱

筛选条件：

```text
难度：新手 / 进阶 / 专业
调式：C / G / D / A / E / F / Am
类型：弹唱谱 / 指弹谱 / AI 谱 / 用户谱
排序：综合 / 最新 / 最多收藏 / 最多点赞
```

## 6. 手动创建吉他谱

创作页拆成两个模式：

```text
手动创建
AI 创建
```

手动创建字段：

```text
歌名
歌手
调式
BPM
变调夹
难度
节奏型
标签
是否公开
曲谱正文
```

曲谱正文 MVP 采用纯文本编辑器：

```text
[主歌]
C              G
窗外的风吹过夏天
Am             F
你低头笑得很浅
```

保存时后端保存 `raw_text` 和结构化 `content_json`。

## 7. 曲谱详情页优化

新增社交操作：

```text
点赞
收藏
关注作者
分享
复制并改编
开始练习
```

顶部展示：

```text
歌名
歌手
作者头像昵称
关注按钮
调式/BPM/变调夹/难度
点赞数/收藏数/浏览数
```

## 8. 用户主页

用户主页字段：

```text
头像
昵称
简介
作品数
获赞数
粉丝数
关注数
```

内容 Tab：

```text
作品
收藏
点赞
```

## 9. 数据模型新增

新增表：

```text
likes
follows
```

优化 songs 表：

```text
artist_name
raw_text
like_count
share_count
comment_count
tags_json
edit_mode: manual / ai / imported
visibility: public / private / unlisted
published_at
```

## 10. 新增接口规划

### 手动创建吉他谱

```http
POST /api/v1/songs/manual
PUT  /api/v1/songs/{song_id}
POST /api/v1/songs/{song_id}/publish
```

### 搜谱

```http
GET /api/v1/search/songs
GET /api/v1/search/hot-keywords
```

### 点赞

```http
POST   /api/v1/songs/{song_id}/like
DELETE /api/v1/songs/{song_id}/like
GET    /api/v1/users/me/likes
```

### 关注

```http
POST   /api/v1/users/{user_id}/follow
DELETE /api/v1/users/{user_id}/follow
GET    /api/v1/users/{user_id}/profile
GET    /api/v1/users/{user_id}/songs
```

## 11. 分阶段落地

### Step 1

产品文档、数据库字段、点赞/关注/手动创建接口。

### Step 2

前端新增搜谱页、手动创建页、用户主页。

### Step 3

曲谱详情页 UI 增加点赞、收藏、关注作者。

### Step 4

首页从 AI 工具首页改为搜谱社区首页。

### Step 5

补关注动态和更完整的社区能力。
