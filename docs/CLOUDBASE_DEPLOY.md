# CloudBase 部署指南

## 1. 适用范围

本文档适用于 `cloudbase-native` 分支。

该分支使用微信云开发原生能力，不使用 Docker、Nginx、FastAPI、MySQL、Redis。

## 2. 前置准备

需要准备：

```text
微信小程序 AppID
微信开发者工具
CloudBase 云开发环境
Node.js
CloudBase CLI
```

安装 CLI：

```bash
npm install -g @cloudbase/cli
```

登录：

```bash
cloudbase login
```

## 3. 云环境初始化

进入项目目录：

```bash
cd mini-weixinapp
```

初始化：

```bash
cloudbase init
```

确认环境 ID 已写入：

```text
cloudbase/cloudbaserc.json
```

## 4. 数据库集合初始化

需要创建以下集合：

```text
users
songs
comments
follows
favorites
likes
notifications
```

集合模板目录：

```text
cloudbase/database/
```

建议权限：

```text
前端只读必要公开数据
所有写操作统一通过云函数完成
```

## 5. 云函数部署顺序

建议按以下顺序部署：

```text
1. login
2. songs
3. ai-generate
4. comments
5. notifications
6. interactions
7. discovery
```

部署全部云函数：

```bash
cloudbase functions:deploy
```

也可以单独部署：

```bash
cloudbase functions:deploy login
cloudbase functions:deploy songs
cloudbase functions:deploy ai-generate
```

## 6. 环境变量

云函数需要在 CloudBase 控制台配置运行环境变量。

建议变量：

```text
OPENAI_API_KEY
OPENAI_MODEL
APP_ENV
```

注意：不要把密钥写入 GitHub。

## 7. 小程序端配置

微信开发者工具中需要：

```text
开启云开发
选择正确环境 ID
确认 app 初始化 wx.cloud
上传云函数
上传小程序代码
```

小程序端前端调用入口：

```text
apps/miniprogram/src/api/provider.ts
```

## 8. 发布流程

推荐流程：

```text
1. 本地启动小程序
2. 部署云函数
3. 创建数据库集合
4. 微信开发者工具预览
5. 发布体验版
6. 测试登录、搜谱、AI生成、评论、点赞收藏
7. 提交审核
8. 发布正式版
```

## 9. 上线检查清单

```text
云环境 ID 正确
云函数全部部署成功
数据库集合已创建
云函数环境变量已配置
小程序端已初始化 wx.cloud
provider.ts 已启用 CloudBase
首页 discovery 数据正常
AI 生成正常
评论正常
点赞收藏正常
消息通知正常
```

## 10. 常见问题

### 云函数调用失败

检查：

```text
云函数是否已部署
环境 ID 是否正确
微信开发者工具是否开启云开发
```

### 数据为空

检查：

```text
songs 集合是否有公开数据
is_public 是否为 true
数据库权限是否允许读取
```

### AI 生成失败

检查：

```text
环境变量是否配置
云函数超时时间是否足够
网络访问是否正常
```
