# CloudBase 部署指南

## 1. 适用范围

本文档适用于 `cloudbase-native` 分支。

该分支使用微信云开发原生能力，不使用 Docker、Nginx、FastAPI、MySQL、Redis。

```text
小程序前端：uni-app / Vue3 / TypeScript
后端：微信云函数 Node.js 18.15
数据库：微信云数据库
AI：CloudBase AI 文本模型 / 混元生图模型
联网歌曲识别：MusicBrainz / iTunes Search，可选 Tavily / Brave Search
```

## 2. 前置准备

需要准备：

```text
微信小程序 AppID
微信开发者工具
CloudBase 云开发环境
Node.js 18+
npm
CloudBase CLI
```

安装 CloudBase CLI：

```bash
npm install -g @cloudbase/cli
```

登录：

```bash
cloudbase login
```

## 3. 拉取分支

```bash
git clone -b cloudbase-native https://github.com/xwta/mini-weixinapp.git
cd mini-weixinapp
```

已有仓库时：

```bash
git fetch origin
git checkout cloudbase-native
git pull origin cloudbase-native
```

## 4. 安装和构建小程序前端

根目录没有 `package.json`，前端依赖位于：

```text
apps/miniprogram/package.json
```

安装依赖：

```bash
cd apps/miniprogram
npm install
```

开发编译：

```bash
npm run dev:mp-weixin
```

生产构建：

```bash
npm run build:mp-weixin
```

构建产物：

```text
apps/miniprogram/dist/build/mp-weixin
```

## 5. 云环境配置

CloudBase 配置文件：

```text
cloudbase/cloudbaserc.json
```

当前环境 ID：

```text
puling-d3g5s478nf9462e61
```

小程序端环境配置：

```text
apps/miniprogram/src/config/index.ts
```

如需切换环境，必须同时修改：

```json
// cloudbase/cloudbaserc.json
{
  "envId": "你的云环境 ID"
}
```

```ts
// apps/miniprogram/src/config/index.ts
export const APP_CONFIG = {
  cloudEnv: '你的云环境 ID'
}
```

小程序启动时会通过 `App.vue` 初始化云开发：

```ts
wx.cloud.init({
  env: APP_CONFIG.cloudEnv || 'DYNAMIC_CURRENT_ENV',
  traceUser: true,
})
```

## 6. 云环境初始化

进入 CloudBase 配置目录：

```bash
cd cloudbase
```

如首次使用，可执行初始化：

```bash
cloudbase init
```

确认环境 ID 写入：

```text
cloudbase/cloudbaserc.json
```

## 7. 数据库集合初始化

需要创建以下集合：

```text
users
songs
comments
follows
favorites
likes
notifications
practice_records
orders
```

集合模板目录：

```text
cloudbase/database/
```

建议权限：

```text
前端只读必要公开数据
所有写操作统一通过云函数完成
私有数据通过 openid 或 user_id 隔离
AI 联网生成结果默认 private，发布前应再审核
```

## 8. 云函数部署顺序

建议先部署基础函数，再部署 AI 和业务扩展函数：

```text
1. login
2. songs
3. web-search
4. ai-generate
5. ai-image
6. comments
7. notifications
8. interactions
9. discovery
10. orders
```

部署全部云函数：

```bash
cloudbase functions:deploy
```

也可以单独部署：

```bash
cloudbase functions:deploy login
cloudbase functions:deploy songs
cloudbase functions:deploy web-search
cloudbase functions:deploy ai-generate
cloudbase functions:deploy ai-image
```

全量部署：

```bash
cloudbase deploy
```

## 9. 联网歌曲识别配置

`web-search` 云函数用于本地曲库搜不到时识别歌曲候选。

默认模式不需要 API Key：

```text
WEB_SEARCH_PROVIDER=open
```

默认使用：

```text
MusicBrainz
 iTunes Search
```

建议配置 MusicBrainz User-Agent：

```text
MUSICBRAINZ_USER_AGENT=PulingAI/1.0 (your-email@example.com)
```

说明：MusicBrainz 对访问频率敏感，云函数内已做简单限频和 6 小时内存缓存。生产环境仍建议减少重复查询。

可选增强网页搜索：

```text
WEB_SEARCH_PROVIDER=auto
TAVILY_API_KEY=xxx
BRAVE_SEARCH_API_KEY=xxx
```

密钥必须配置在 CloudBase 云函数环境变量或密钥管理中，不要写进前端代码或 GitHub。

## 10. AI 能力配置

当前分支使用 CloudBase AI：

```text
ai-generate：CloudBase 文本模型，生成曲谱 JSON
ai-generate type=web_chords：根据联网歌曲候选生成 AI 简化弹唱编配版
ai-image：CloudBase 混元生图模型，生成图片 URL
```

当前实现不要求在仓库中配置 `OPENAI_API_KEY`。

如果后续新增 OpenAI 或其他第三方模型 provider，请在 CloudBase 控制台通过云函数环境变量或密钥管理配置，不要把密钥写入 GitHub。

## 11. 小程序端配置

微信开发者工具中需要：

```text
导入 apps/miniprogram/dist/build/mp-weixin
绑定微信小程序 AppID
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

页面不要直接调用 `wx.cloud.callFunction`。推荐链路：

```text
page.vue
  ↓
api/*.ts
  ↓
api/provider.ts
  ↓
wx.cloud.callFunction
```

## 12. 发布流程

推荐流程：

```text
1. 构建小程序端 npm run build:mp-weixin
2. 部署云函数 cloudbase functions:deploy
3. 创建数据库集合
4. 微信开发者工具导入 dist/build/mp-weixin
5. 预览并测试核心链路
6. 发布体验版
7. 测试登录、搜谱、本地搜不到后的 web-search、web_chords AI 生成、评论、点赞收藏、消息、订单
8. 提交审核
9. 发布正式版
```

## 13. 上线检查清单

```text
云环境 ID 正确
小程序端 cloudEnv 正确
云函数全部部署成功
数据库集合已创建
CloudBase AI 能力已开通
小程序端已初始化 wx.cloud
provider.ts 已启用 CloudBase
首页 discovery 数据正常
登录 login 正常
本地搜谱 songs 正常
联网候选 web-search 正常
AI 生成 ai-generate 正常
web_chords 生成结果 source_type=ai_web 且默认 private
AI 生图 ai-image 正常
评论 comments 正常
点赞收藏 interactions 正常
消息通知 notifications 正常
订单 orders 正常
```

注意：`orders` 当前为 mock 支付链路，不可直接作为正式收款能力上线。

## 14. 常见问题

### 根目录执行 npm install 失败

根目录没有前端包配置。请进入：

```bash
cd apps/miniprogram
npm install
```

### 云函数调用失败

检查：

```text
云函数是否已部署
环境 ID 是否正确
微信开发者工具是否开启云开发
小程序端是否选择同一云环境
运行平台是否为 MP-WEIXIN
```

### 提示云开发未初始化

检查：

```text
App.vue 中 wx.cloud.init 是否执行
APP_CONFIG.cloudEnv 是否正确
微信开发者工具是否启用云开发
```

### 数据为空

检查：

```text
songs 集合是否有公开数据
is_public 是否为 true
数据库权限是否允许读取
```

### 本地搜不到后没有联网候选

检查：

```text
web-search 是否已部署
云函数是否允许访问外网
MusicBrainz / iTunes Search 是否可访问
是否配置了有效 MUSICBRAINZ_USER_AGENT
```

默认无 Key 模式即使未找到明确歌曲，也会返回关键词 fallback，允许用户生成 AI 简化弹唱编配版。

### AI 生成失败

检查：

```text
CloudBase AI 能力是否开通
ai-generate 是否部署成功
云函数超时时间是否足够
用户 generation_quota 是否大于 0
输入内容是否触发敏感词拦截
```

### AI 生图失败

检查：

```text
CloudBase 混元生图模型是否可用
ai-image 是否部署成功
prompt 是否为空
云函数超时时间是否足够
```

### 订单无法真实支付

当前 `orders` 云函数使用 mock 支付参数，只用于会员链路调试。正式上线前需要补充微信支付下单、签名、回调验签、订单状态流转和异常补偿。
