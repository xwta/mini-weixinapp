# 谱灵 AI 微信小程序 CloudBase 原生版

谱灵 AI 是一款面向吉他弹唱创作、搜谱、练习与社区分享的小程序。`cloudbase-native` 分支使用微信云开发原生能力实现前端、小程序云函数、云数据库、云存储和 CloudBase AI 能力的闭环。

核心目标：用户输入一句灵感、一段歌词或一个想弹的歌名，小程序可以生成可练习、可收藏、可发布的中文吉他弹唱谱。

## 分支定位

| 分支 | 定位 | 后端形态 | 适合场景 |
|---|---|---|---|
| `main` | 企业级服务端方案 | FastAPI + MySQL + Redis + 云托管 | 复杂服务、后台系统、跨端 API |
| `cloudbase-native` | 微信云开发原生方案 | 云函数 + 云数据库 + 云存储 | 小程序 MVP、低运维、快速上线 |

本分支不依赖 Docker、Nginx、FastAPI、MySQL 或 Redis。所有小程序端业务请求统一走 `wx.cloud.callFunction`。

## 整体架构

```text
uni-app / Vue3 小程序
        ↓
apps/miniprogram/src/api/*.ts
        ↓
apps/miniprogram/src/api/provider.ts
        ↓
wx.cloud.callFunction
        ↓
cloudbase/cloudfunctions/*
        ↓
微信云数据库 / 微信云存储 / CloudBase AI / 开放音乐元数据
```

关键调用链：

```text
页面组件
  ↓
业务 API 模块
  ↓
provider.ts 统一封装
  ↓
云函数
  ↓
云数据库、云存储、CloudBase AI、MusicBrainz / iTunes Search
```

## 当前能力范围

### 用户与社区

- 微信登录、自动注册、登录态恢复
- 曲谱搜索、曲谱详情、我的曲谱
- 手动创建曲谱、发布曲谱、删除曲谱
- 用户主页、关注、取消关注
- 点赞、收藏、收藏列表、点赞列表
- 评论列表、创建评论、删除评论
- 消息列表、未读数、已读、全部已读

### 搜谱与联网候选

- 优先搜索本地 `songs` 公开曲库。
- 本地无结果时调用 `web-search` 云函数识别网络歌曲元数据。
- `web-search` 默认不需要 API Key，优先使用 MusicBrainz 与 iTunes Search。
- 支持可选增强搜索：Tavily / Brave Search。
- 联网结果只用于识别歌曲，不复制第三方完整歌词或现成吉他谱。
- 用户确认后，才生成 AI 简化弹唱编配版，避免自动扣额度。

### AI 创作

- 根据灵感生成中文吉他弹唱谱。
- 根据歌词自动配和弦。
- 根据联网歌曲候选生成 AI 简化弹唱编配版吉他谱。
- 自动生成结构化段落、和弦、节奏型、练习建议。
- 自动扣减免费生成额度。
- AI 生图云函数 `ai-image`，基于 CloudBase 混元生图模型。

### 发现与练习

- 首页热门曲谱
- 首页推荐曲谱
- 热搜关键词
- 练习记录创建与最近练习记录

### 会员与订单

- 会员套餐列表
- 模拟订单创建
- 我的订单列表

> 说明：当前订单函数使用 mock 支付参数，正式微信支付接入前不要把它当作真实收款链路。

## 技术栈

| 层级 | 技术 |
|---|---|
| 小程序前端 | uni-app、Vue3、TypeScript、Vite、Sass |
| 云函数 | Node.js 18.15、wx-server-sdk、@cloudbase/node-sdk |
| 数据库 | 微信云数据库 |
| 存储 | 微信云存储 |
| AI 文本 | CloudBase AI 文本模型 |
| AI 生图 | CloudBase 混元生图模型 |
| 音乐元数据 | MusicBrainz、iTunes Search，可选 Tavily / Brave Search |
| 部署 | CloudBase CLI、微信开发者工具 |

## 项目结构

```text
apps/
└── miniprogram/                 # uni-app 小程序前端
    ├── package.json             # 前端依赖与构建脚本
    └── src/
        ├── api/                 # 云函数调用封装
        ├── config/              # 小程序端环境配置
        ├── pages/               # 页面
        ├── stores/              # 状态管理
        └── styles/              # 全局样式

cloudbase/
├── cloudbaserc.json             # CloudBase 环境与云函数配置
├── cloudfunctions/              # 云函数源码
└── database/                    # 数据库集合模板

docs/                            # CloudBase 方案、API、数据库、部署文档
assets/                          # 静态资产
design/                          # 设计资料
```

## 云函数清单

| 云函数 | 主要用途 | 关键 action / type |
|---|---|---|
| `login` | 微信登录、自动注册、更新登录时间 | 默认登录 |
| `songs` | 曲谱搜索、详情、我的曲谱、手动建谱、发布、删除、用户主页、关注、练习记录 | `search`、`detail`、`mine`、`manualCreate`、`publish`、`remove`、`userSongs`、`userProfile`、`follow`、`unfollow`、`practiceCreate`、`practiceRecent` |
| `web-search` | 本地搜不到时联网识别歌曲候选 | `action=songLookup` |
| `ai-generate` | AI 写歌、AI 配和弦、联网候选生成简化弹唱谱、保存 AI 曲谱、扣减额度 | `type=songwriting`、`type=chords`、`type=web_chords` |
| `ai-image` | 根据提示词生成图片 | `prompt` |
| `comments` | 评论列表、创建、删除 | `list`、`create`、`remove` |
| `notifications` | 消息列表、未读数、已读、全部已读、创建系统消息 | `list`、`unreadCount`、`read`、`readAll`、`create` |
| `interactions` | 点赞、收藏、列表 | `toggleLike`、`toggleFavorite`、`likeSong`、`unlikeSong`、`addFavorite`、`removeFavorite`、`listFavorites`、`listLiked` |
| `discovery` | 首页、热门、推荐、热搜关键词 | `home`、`hot`、`recommend`、`keywords` |
| `orders` | 会员套餐、模拟下单、我的订单 | `products`、`create`、`mine` |

云函数部署配置在：

```text
cloudbase/cloudbaserc.json
```

## 数据集合

核心集合：

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

`songs` 中 AI 联网生成的曲谱会使用：

```text
source_type = ai_web
visibility = private
audit_status = private
generation_source.type = web_search
```

建议原则：

- 前端只读必要公开数据。
- 用户写入统一通过云函数完成。
- 私有数据按 `openid` 或 `user_id` 隔离。
- 公开曲谱使用 `is_public=true` 控制首页、搜索和推荐可见性。
- AI 联网生成结果默认私有，用户发布前应再走审核。

## 快速启动

### 1. 拉取分支

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

### 2. 安装小程序前端依赖

根目录没有 `package.json`，请进入小程序目录安装：

```bash
cd apps/miniprogram
npm install
```

本地开发编译：

```bash
npm run dev:mp-weixin
```

生产构建：

```bash
npm run build:mp-weixin
```

构建产物默认输出到：

```text
apps/miniprogram/dist/build/mp-weixin
```

### 3. 配置云环境 ID

当前分支已配置环境 ID：

```text
puling-d3g5s478nf9462e61
```

相关文件：

```text
cloudbase/cloudbaserc.json
apps/miniprogram/src/config/index.ts
```

如需切换到自己的云环境，请同步修改这两个文件。

小程序启动时会在 `App.vue` 中执行：

```ts
wx.cloud.init({
  env: APP_CONFIG.cloudEnv || 'DYNAMIC_CURRENT_ENV',
  traceUser: true,
})
```

### 4. 部署云函数

安装并登录 CloudBase CLI：

```bash
npm install -g @cloudbase/cli
cloudbase login
```

进入 CloudBase 配置目录：

```bash
cd ../../cloudbase
```

部署全部资源：

```bash
cloudbase deploy
```

只部署云函数：

```bash
cloudbase functions:deploy
```

单独部署关键云函数：

```bash
cloudbase functions:deploy login
cloudbase functions:deploy songs
cloudbase functions:deploy web-search
cloudbase functions:deploy ai-generate
cloudbase functions:deploy ai-image
```

### 5. 联网歌曲识别配置

`web-search` 默认不需要 API Key：

```text
WEB_SEARCH_PROVIDER=open
```

默认会使用：

```text
MusicBrainz
 iTunes Search
```

建议可选配置：

```text
MUSICBRAINZ_USER_AGENT=PulingAI/1.0 (your-email@example.com)
```

如果要启用增强网页搜索，可选配置：

```text
WEB_SEARCH_PROVIDER=auto
TAVILY_API_KEY=你的 Tavily Key
BRAVE_SEARCH_API_KEY=你的 Brave Search Key
```

不要把任何 Key 写入前端代码或 GitHub。

### 6. 初始化数据库集合

在云开发控制台创建以下集合，或使用 `cloudbase/database/` 中的模板导入：

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

推荐权限策略：

```text
前端读取公开曲谱和公开资料
所有创建、更新、删除操作统一通过云函数
```

### 7. 使用微信开发者工具打开

推荐流程：

```text
1. 运行 npm run dev:mp-weixin 或 npm run build:mp-weixin
2. 打开微信开发者工具
3. 导入 apps/miniprogram/dist/build/mp-weixin
4. 绑定小程序 AppID
5. 开启云开发并选择正确环境
6. 预览登录、搜谱、本地搜不到后的联网候选、AI 生成、评论、点赞收藏、消息、订单等核心链路
```

## 前端 API 接入状态

| 模块 | 文件 | 云函数 | 状态 |
|---|---|---|---|
| Auth API | `src/api/auth.ts` | `login` | 已接入 |
| Songs API | `src/api/songs.ts` | `songs` | 已接入 |
| Web Search API | `src/api/webSearch.ts` | `web-search` | 已接入 |
| AI API | `src/api/ai.ts` | `ai-generate` | 已接入，含 `createWebChords` |
| Comments API | `src/api/comments.ts` | `comments` | 已接入 |
| Discovery API | `src/api/discovery.ts` | `discovery` | 已接入 |
| Notifications API | `src/api/notifications.ts` | `notifications` | 已接入 |
| Interactions API | `src/api/interactions.ts` | `interactions` | 已接入 |

统一封装入口：

```text
apps/miniprogram/src/api/provider.ts
```

页面不要直接调用 `wx.cloud.callFunction`，统一通过 `src/api/*.ts` 调用，方便后续切换 provider 或统一处理错误。

## AI 配置说明

当前 `ai-generate` 与 `ai-image` 使用 CloudBase AI 能力：

- `ai-generate` 使用 `app.ai().createModel(...)` 生成文本曲谱。
- `ai-generate type=web_chords` 根据联网歌曲元数据生成 AI 简化弹唱编配版。
- `ai-image` 使用 `app.ai().createImageModel('hunyuan-image')` 生成图片。

当前实现不要求在仓库里配置 `OPENAI_API_KEY`。如后续新增 OpenAI provider，请通过云函数环境变量或密钥管理配置，严禁把密钥写入 GitHub。

## 常用开发命令

```bash
# 前端开发
cd apps/miniprogram
npm run dev:mp-weixin

# 前端构建
npm run build:mp-weixin

# 云函数部署
cd ../../cloudbase
cloudbase functions:deploy

# 单函数部署
cloudbase functions:deploy web-search
cloudbase functions:deploy ai-generate
cloudbase functions:deploy songs

# 全量部署
cloudbase deploy
```

## 上线检查清单

- [ ] `cloudbase/cloudbaserc.json` 中的 `envId` 正确。
- [ ] `apps/miniprogram/src/config/index.ts` 中的 `cloudEnv` 正确。
- [ ] 微信开发者工具已开启云开发，并选择同一个环境。
- [ ] 云函数已部署：`login`、`songs`、`web-search`、`ai-generate`、`ai-image`、`comments`、`notifications`、`interactions`、`discovery`、`orders`。
- [ ] 数据集合已创建：`users`、`songs`、`comments`、`follows`、`favorites`、`likes`、`notifications`、`practice_records`、`orders`。
- [ ] 首页 `discovery` 能返回公开曲谱。
- [ ] 登录后 `users` 集合能自动创建或更新用户。
- [ ] 本地搜不到曲谱时，`web-search` 能返回 MusicBrainz / iTunes 候选或 fallback。
- [ ] AI 生成能写入 `songs`，并正确扣减 `generation_quota`。
- [ ] `web_chords` 生成结果默认私有且 `source_type=ai_web`。
- [ ] 评论、点赞、收藏、消息、订单核心链路可用。
- [ ] 支付仍为 mock，不要在正式版中展示为真实支付。

## 常见问题

### 1. 根目录执行 `npm install` 失败

前端包位于 `apps/miniprogram/`，请执行：

```bash
cd apps/miniprogram
npm install
```

### 2. 提示“云开发未初始化”

检查微信开发者工具是否开启云开发、`APP_CONFIG.cloudEnv` 是否正确、`App.vue` 中 `wx.cloud.init` 是否执行、当前运行平台是否为 MP-WEIXIN。

### 3. 云函数调用失败

检查 `cloudbase/cloudbaserc.json` 的 envId 是否正确、云函数是否已部署、小程序端是否选择了同一个云环境、云函数运行时是否为 Nodejs18.15。

### 4. 首页或搜索没有数据

检查 `songs` 集合是否存在公开曲谱、曲谱 `is_public` 是否为 true、数据库权限是否允许读取公开数据、索引和排序字段是否存在。

### 5. 本地搜不到后没有联网候选

检查 `web-search` 是否已部署。默认无 Key 模式会使用 MusicBrainz 与 iTunes Search；如果网络不可用，会返回关键词 fallback。建议配置 `MUSICBRAINZ_USER_AGENT`。

### 6. AI 生成失败

检查 CloudBase AI 能力是否开通、`ai-generate` 云函数是否部署成功、云函数超时时间是否为 60 秒、用户 `generation_quota` 是否大于 0、输入内容是否触发敏感词拦截。

### 7. 订单无法真实支付

当前 `orders` 云函数返回的是 mock 支付参数，仅用于会员链路占位和前端调试。正式接入微信支付前，需要补充真实下单、签名、回调验签、订单状态流转和风控逻辑。

## 文档索引

- [CloudBase 产品方案](docs/CLOUDBASE_PRODUCT.md)
- [CloudBase API 文档](docs/CLOUDBASE_API.md)
- [CloudBase 数据库设计](docs/CLOUDBASE_DATABASE.md)
- [CloudBase 部署指南](docs/CLOUDBASE_DEPLOY.md)
- [CloudBase 前端接入指南](docs/CLOUDBASE_FRONTEND_GUIDE.md)
- [CloudBase 变更记录](docs/CLOUDBASE_CHANGELOG.md)
