# 谱灵 AI 微信小程序 CloudBase 版

谱灵 AI CloudBase 版是一款基于微信云开发的 AI 吉他谱创作小程序。

核心目标：输入一句灵感，让 AI 生成一首能直接弹唱的歌。

## 架构

```text
微信小程序
     ↓
云函数
     ↓
云数据库
     ↓
云存储
     ↓
AI能力
```

## 核心能力

- AI 写歌
- AI 自动生成吉他谱
- AI 配和弦
- 手动创建曲谱
- 搜索曲谱
- 收藏
- 点赞
- 评论
- 关注
- 练习模式
- 首页热门推荐
- 消息通知

## 技术栈

```text
前端：uni-app / Vue3 / TypeScript
后端：微信云函数 Node.js
数据库：微信云数据库
存储：微信云存储
AI：OpenAI API
```

## 项目结构

```text
apps/
└── miniprogram/

cloudbase/
├── cloudfunctions/
├── database/
└── cloudbaserc.json

assets/
design/
docs/
```

## 云函数列表

```text
login            微信登录/自动注册
songs            搜谱/详情/我的曲谱/手动建谱
ai-generate      AI写歌/AI配和弦
comments         评论列表/创建/删除
notifications    消息列表/未读/已读
interactions     点赞/收藏
discovery        首页热门/推荐/热搜
```

## 当前实现状态

### CloudBase 后端

```text
✅ login
✅ songs
✅ ai-generate
✅ comments
✅ notifications
✅ interactions
✅ discovery
```

### 小程序前端 Provider 接入

```text
✅ Songs API
✅ Comments API
✅ Discovery API
✅ AI API
⬜ Notifications API
⬜ Interactions API
⬜ Auth API
```

## 快速启动

安装依赖：

```bash
npm install
```

初始化云环境：

```bash
cloudbase login
cloudbase init
```

部署：

```bash
cloudbase deploy
```

## 文档

- [CloudBase 产品方案](docs/CLOUDBASE_PRODUCT.md)
- [CloudBase API 文档](docs/CLOUDBASE_API.md)
- [CloudBase 数据库设计](docs/CLOUDBASE_DATABASE.md)
- [CloudBase 部署指南](docs/CLOUDBASE_DEPLOY.md)
- [CloudBase 前端接入指南](docs/CLOUDBASE_FRONTEND_GUIDE.md)
- [CloudBase 变更记录](docs/CLOUDBASE_CHANGELOG.md)

## 分支说明

```text
main
  企业级 FastAPI + MySQL + 云托管方案

cloudbase-native
  微信云开发原生方案
```
