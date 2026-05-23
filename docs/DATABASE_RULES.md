# CloudBase 数据库权限规则建议

## 1. 总原则

CloudBase 原生版建议采用：

```text
公开数据有限读
所有写操作走云函数
敏感数据不直接暴露给前端
```

## 2. 集合权限建议

| 集合 | 前端读 | 前端写 | 云函数读写 | 说明 |
|---|---|---|---|---|
| users | 仅本人 | 禁止 | 允许 | 用户资料与额度 |
| songs | 公开曲谱可读 | 禁止 | 允许 | 曲谱核心数据 |
| comments | 公开评论可读 | 禁止 | 允许 | 评论统一走云函数 |
| follows | 仅相关关系可读 | 禁止 | 允许 | 关注关系 |
| favorites | 仅本人可读 | 禁止 | 允许 | 收藏关系 |
| likes | 仅本人可读 | 禁止 | 允许 | 点赞关系 |
| notifications | 仅本人可读 | 禁止 | 允许 | 消息通知 |

## 3. 推荐访问模式

```text
页面
  ↓
api/*.ts
  ↓
provider.ts
  ↓
云函数
  ↓
云数据库
```

## 4. 禁止模式

```text
页面直接写数据库
页面直接修改计数字段
页面直接扣减 AI 额度
页面直接创建系统通知
```

## 5. 计数字段更新

以下字段必须由云函数维护：

```text
songs.like_count
songs.favorite_count
songs.comment_count
songs.view_count
users.works_count
users.total_generated
users.generation_quota
```

## 6. 内容审核

以下内容需要在云函数侧审核：

```text
AI 生成输入
AI 生成结果
评论内容
用户昵称
公开曲谱标题
```

## 7. MVP 阶段简化策略

MVP 阶段可以先采用：

```text
前端读公开数据
云函数负责全部写入
```

上线后再逐步细化每个集合权限。
