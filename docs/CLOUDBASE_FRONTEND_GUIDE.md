# CloudBase 前端接入指南

## 1. 目标

`cloudbase-native` 分支的小程序前端通过云函数访问后端能力，不再直接请求 FastAPI HTTP 接口。

统一调用链路：

```text
页面
  ↓
业务 API 模块
  ↓
provider.ts
  ↓
wx.cloud.callFunction
  ↓
云函数
```

## 2. 云环境初始化

小程序启动时在 `apps/miniprogram/src/App.vue` 中初始化云开发：

```ts
wx.cloud.init({
  env: APP_CONFIG.cloudEnv || 'DYNAMIC_CURRENT_ENV',
  traceUser: true,
})
```

环境 ID 配置在：

```text
apps/miniprogram/src/config/index.ts
```

当前配置：

```text
cloudEnv = puling-d3g5s478nf9462e61
```

如需切换环境，请同步修改 `cloudbase/cloudbaserc.json` 和 `apps/miniprogram/src/config/index.ts`。

## 3. Provider 文件

入口文件：

```text
apps/miniprogram/src/api/provider.ts
```

职责：

```text
检查 wx.cloud 是否可用
统一调用 wx.cloud.callFunction
解析云函数统一返回结构
处理 code=401 的登录失效
统一展示错误 toast
屏蔽页面层对云函数的直接依赖
```

云函数统一返回结构：

```json
{
  "code": 0,
  "data": {},
  "message": ""
}
```

## 4. 已接入模块

| 模块 | 前端文件 | 云函数 | 状态 |
|---|---|---|---|
| Auth API | `src/api/auth.ts` | `login` | 已接入 |
| Songs API | `src/api/songs.ts` | `songs` | 已接入 |
| Web Search API | `src/api/webSearch.ts` | `web-search` | 已接入 |
| AI API | `src/api/ai.ts` | `ai-generate` | 已接入，含 `createWebChords` |
| Comments API | `src/api/comments.ts` | `comments` | 已接入 |
| Discovery API | `src/api/discovery.ts` | `discovery` | 已接入 |
| Notifications API | `src/api/notifications.ts` | `notifications` | 已接入 |
| Interactions API | `src/api/interactions.ts` | `interactions` | 已接入 |

说明：`ai-image` 和 `orders` 云函数已存在，若页面需要使用，需要新增或补齐对应的前端 API 封装。

## 5. 谱灵页搜索与 AI 生成链路

`pages/chat/index.vue` 当前搜索链路：

```text
用户输入歌名 / 吉他谱关键词
  ↓
searchSongs 查询本地 songs 公开曲库
  ↓
本地有结果：展示 AiResultCard，可查看曲谱 / 开始练习
  ↓
本地无结果：searchWebSong 调用 web-search
  ↓
展示 WebSongSuggestionCard
  ↓
用户点击 AI生成吉他谱
  ↓
createWebChords 调用 ai-generate type=web_chords
  ↓
保存 source_type=ai_web 的私有曲谱
```

前端相关文件：

```text
apps/miniprogram/src/pages/chat/index.vue
apps/miniprogram/src/api/webSearch.ts
apps/miniprogram/src/api/ai.ts
apps/miniprogram/src/components/home/WebSongSuggestionCard.vue
```

注意：联网候选只用于识别歌曲，不展示完整歌词或现成第三方曲谱。

## 6. 页面关系

```text
谱灵页
  ↓
Songs API / Web Search API / AI API
  ↓
songs / web-search / ai-generate 云函数

社区页
  ↓
Discovery API / Songs API / Interactions API
  ↓
discovery / songs / interactions 云函数

曲谱详情评论区
  ↓
Comments API
  ↓
comments 云函数

消息中心
  ↓
Notifications API
  ↓
notifications 云函数

点赞收藏
  ↓
Interactions API
  ↓
interactions 云函数

登录
  ↓
Auth API
  ↓
login 云函数
```

## 7. 封装原则

页面不直接调用 `wx.cloud.callFunction`。

推荐链路：

```text
page.vue
  ↓
api/*.ts
  ↓
api/provider.ts
```

新增接口时建议：

```text
1. 在 cloudbase/cloudfunctions 中补齐云函数 action
2. 在 src/api 中新增或扩展业务 API 文件
3. 页面只调用业务 API，不感知 functionName 和 action
4. 错误码、toast、登录失效交给 provider.ts 统一处理
```

## 8. 错误处理

统一错误码：

```text
code = 0      正常返回
code = 400    参数错误
code = 401    未登录，provider 会触发 logout
code = 403    权限不足、额度不足或内容审核不通过
code = 404    数据不存在
code >= 500   服务端错误，提示服务繁忙或具体错误
```

页面层只处理业务状态，不重复弹出通用错误。

## 9. 环境切换

MVP 阶段固定使用 CloudBase：

```text
wx.cloud.callFunction
```

联网歌曲识别默认无需 Key：

```text
WEB_SEARCH_PROVIDER=open
```

如果启用 Tavily / Brave 增强搜索，需要在 CloudBase 云函数环境变量配置，不要写进前端代码。

后续如果需要在 CloudBase 与 HTTP API 间切换，可引入：

```text
VITE_API_PROVIDER=cloudbase
VITE_API_PROVIDER=http
```

当前分支暂未启用该环境变量。

## 10. 微信开发者工具配置

```text
开启云开发
绑定 CloudBase 环境
上传并部署云函数，包括 web-search 和 ai-generate
确认云数据库集合存在
确认小程序端已初始化 wx.cloud
导入 apps/miniprogram/dist/build/mp-weixin
```

## 11. 常见问题

### 提示“云开发未初始化，请检查 wx.cloud.init 配置”

检查：

```text
是否在微信小程序平台运行
微信开发者工具是否开启云开发
APP_CONFIG.cloudEnv 是否正确
App.vue 是否执行 wx.cloud.init
```

### code=401

表示当前用户未登录或本地登录态失效。前端 provider 会调用 `authStore.logout()`，页面应引导用户重新登录。

### 非微信平台运行失败

`provider.ts` 当前只支持 `MP-WEIXIN`。H5 或其他平台会抛出：

```text
当前平台不支持云函数调用
```

### 新增云函数后页面调用不到

检查：

```text
cloudbase/cloudbaserc.json 是否声明该函数
云函数是否已部署
src/api/*.ts 是否新增封装
functionName 和 action 是否拼写一致
```

### 本地搜不到后没有联网候选

检查：

```text
web-search 是否部署
src/api/webSearch.ts 是否存在
chat/index.vue 是否引入 searchWebSong
云函数是否能访问 MusicBrainz / iTunes Search
```
