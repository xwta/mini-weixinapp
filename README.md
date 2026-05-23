# 谱灵 AI 微信小程序 CloudBase 版

谱灵 AI CloudBase 版是一款基于微信云开发的 AI 吉他谱创作小程序。

核心目标：

输入一句灵感，让 AI 生成一首能直接弹唱的歌。

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

## 技术栈

```text
前端:
uni-app
Vue3
TypeScript

后端:
微信云函数 Node.js

数据库:
微信云数据库

存储:
微信云存储

AI:
OpenAI API
```

## 项目结构

```text
apps/
   miniprogram/

cloudbase/
   cloudfunctions/
   database/
   cloudbaserc.json

assets/
docs/
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

- CLOUDBASE_PRODUCT.md
- CLOUDBASE_API.md
- CLOUDBASE_DATABASE.md

## 分支说明

```text
main
  企业级 FastAPI + MySQL + 云托管方案

cloudbase-native
  微信云开发原生方案
```
