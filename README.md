# 谱灵 AI 微信小程序

谱灵 AI 是一款面向吉他弹唱用户的微信小程序产品方案，核心能力是通过 AI 自动生成吉他谱、歌词、和弦、节奏型和弹唱练习建议。

## 产品定位

输入一句灵感，AI 生成一首能弹唱的歌。

产品不是单纯复制传统曲谱库，而是围绕 AI 原创弹唱谱、AI 写歌、AI 配和弦和练习体验打造。

## 核心功能

- AI 写歌：根据主题、情绪、风格生成原创歌词和弹唱结构
- AI 生成吉他谱：生成调式、BPM、变调夹、和弦和节奏型
- AI 配和弦：粘贴歌词后自动匹配新手友好的吉他和弦
- 曲谱详情：展示歌词、和弦、主歌、副歌、桥段等内容
- 练习模式：自动滚谱、字体放大、节拍器、段落循环
- 我的作品：保存 AI 生成记录、收藏曲谱、管理原创作品
- 商业化：免费次数、次数包、会员、导出图片和 PDF

## 文档目录

- [产品需求文档 PRD](docs/PRD.md)
- [页面原型文档](docs/WIREFRAME.md)
- [接口设计文档](docs/API.md)
- [数据库设计文档](docs/DATABASE.md)
- [开发路线图](docs/ROADMAP.md)
- [UI 视觉规范](docs/UI-GUIDE.md)
- [UI 设计图与前端资产](design/README.md)

## UI 设计资产

- [横版 Logo](assets/logo/puling-logo.svg)
- [小程序图标](assets/logo/puling-icon.svg)
- [首页 UI 预览](design/home-page.svg)
- [AI 创作页 UI 预览](design/ai-create-page.svg)
- [曲谱详情页 UI 预览](design/song-detail-page.svg)

## 推荐技术栈

- 前端：uni-app / Vue3
- 后端：Node.js / NestJS
- 数据库：MySQL 或 PostgreSQL
- 缓存：Redis
- 存储：腾讯云 COS / 阿里云 OSS
- 支付：微信支付
- AI 能力：OpenAI / 通义千问 / DeepSeek 等

## 当前阶段

当前仓库已完成产品设计文档框架和基础 UI 设计资产，后续可继续进入项目初始化与开发阶段。

建议下一步：

1. 初始化小程序前端项目。
2. 初始化后端服务项目。
3. 建立数据库迁移文件。
4. 接入 AI 生成接口。
5. 完成 MVP 核心闭环。
