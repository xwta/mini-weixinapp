# 谱灵 AI CloudBase 数据库设计

## 1. 数据库类型

CloudBase 原生版使用微信云开发云数据库。该分支不使用 MySQL 和 Redis。

核心集合：users、songs、comments、follows、favorites、likes、notifications。

## 2. users

用途：用户资料、会员状态、AI 生成额度、社区统计。

核心字段：

| 字段 | 说明 |
|---|---|
| _id | 云数据库文档 ID |
| openid | 微信用户标识 |
| nickname | 昵称 |
| avatar_url | 头像 |
| membership_type | 会员类型 |
| generation_quota | 剩余生成次数 |
| total_generated | 累计生成次数 |
| works_count | 作品数 |
| followers_count | 粉丝数 |
| following_count | 关注数 |
| likes_count | 获赞数 |
| status | 用户状态 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

建议索引：openid、status、created_at。

## 3. songs

用途：AI 曲谱、手动曲谱、公开曲谱、私有草稿。

核心字段：

| 字段 | 说明 |
|---|---|
| _id | 曲谱 ID |
| user_openid | 创建者 |
| user_id | 创建者文档 ID |
| title | 歌名 |
| artist_name | 歌手 |
| style | 风格 |
| song_key | 调式 |
| bpm | 速度 |
| capo | 变调夹 |
| difficulty | 难度 |
| tags | 标签 |
| raw_text | 原始曲谱文本 |
| content_json | 结构化曲谱 |
| source_type | ai 或 user_upload |
| edit_mode | ai 或 manual |
| is_public | 是否公开 |
| audit_status | 审核状态 |
| favorite_count | 收藏数 |
| like_count | 点赞数 |
| comment_count | 评论数 |
| view_count | 浏览数 |
| practice_count | 练习数 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

建议索引：user_openid、is_public、created_at、like_count、view_count、title、artist_name。

## 4. comments

用途：曲谱评论和回复。

核心字段：_id、song_id、user_openid、user_id、parent_id、content、like_count、status、created_at、updated_at。

建议索引：song_id、user_openid、created_at、status。

## 5. follows

用途：用户关注关系。

核心字段：_id、follower_openid、following_openid、created_at。

建议索引：follower_openid、following_openid。

## 6. favorites

用途：用户收藏曲谱关系。

核心字段：_id、user_openid、song_id、created_at。

建议索引：user_openid、song_id。

## 7. likes

用途：用户点赞曲谱关系。

核心字段：_id、user_openid、song_id、created_at。

建议索引：user_openid、song_id。

## 8. notifications

用途：点赞、关注、评论、系统通知。

核心字段：_id、user_openid、type、title、content、target_id、is_read、created_at。

建议索引：user_openid、is_read、created_at。

## 9. 权限原则

MVP 阶段所有写入统一通过云函数处理，前端不直接写数据库。

链路：小程序端 → 云函数 → 云数据库。
