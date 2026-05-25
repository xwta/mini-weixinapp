# CloudBase Changelog

## v0.1.2

### Added

- 新增 `web-search` 云函数，用于本地曲库搜不到时识别联网歌曲候选。
- `web-search` 默认支持无 API Key 模式，优先使用 MusicBrainz 与 iTunes Search 获取歌曲元数据。
- `web-search` 支持可选增强搜索：Tavily 与 Brave Search。
- 新增前端 API：`apps/miniprogram/src/api/webSearch.ts`。
- 新增前端组件：`WebSongSuggestionCard.vue`，用于展示网络候选歌曲与 AI 生成按钮。
- `ai-generate` 新增 `type=web_chords`，可根据联网歌曲候选生成 AI 简化弹唱编配版。
- `apps/miniprogram/src/api/ai.ts` 新增 `createWebChords`。

### Changed

- `pages/chat/index.vue` 搜谱逻辑升级：本地曲库无结果时，自动调用 `web-search`，并在用户确认后再生成 AI 吉他谱。
- `web_chords` 生成结果默认私有，`source_type=ai_web`，并记录 `generation_source`。
- 更新 `README.md`，同步 `web-search`、无 Key 联网歌曲识别、`web_chords` 生成链路与部署说明。
- 更新 `CLOUDBASE_API.md`，补充 `web-search` 和 `ai-generate type=web_chords` API 文档。
- 更新 `CLOUDBASE_DEPLOY.md`，补充 `web-search` 部署顺序、环境变量、上线检查与常见问题。
- 更新 `CLOUDBASE_FRONTEND_GUIDE.md`，补充前端搜索链路、`webSearch.ts`、`WebSongSuggestionCard` 和 `createWebChords`。

### Notes

- 联网搜索只用于识别歌曲元数据，不复制第三方完整歌词或现成吉他谱。
- 默认无 Key 模式可直接部署使用；生产建议配置 `MUSICBRAINZ_USER_AGENT`。
- 如需更强网页搜索，可配置 `WEB_SEARCH_PROVIDER=auto` 并添加 `TAVILY_API_KEY` 或 `BRAVE_SEARCH_API_KEY`。

## v0.1.1

### Changed

- 完善 `README.md`，补充分支定位、整体架构、项目结构、云函数清单、数据集合、启动步骤、部署步骤、上线检查清单和常见问题。
- 更新 `CLOUDBASE_DEPLOY.md`，明确根目录没有 `package.json`，前端依赖需在 `apps/miniprogram/` 安装。
- 更新 `CLOUDBASE_DEPLOY.md`，补充 `ai-image`、`orders`、`practice_records` 等现有能力与集合。
- 更新 `CLOUDBASE_DATABASE.md`，补充 `practice_records` 和 `orders` 集合设计。
- 更新 `CLOUDBASE_FRONTEND_GUIDE.md`，同步 Auth、Notifications、Interactions API 已接入状态。
- 更新 `CLOUDBASE_API.md`，补全 `songs`、`ai-generate`、`ai-image`、`notifications`、`interactions`、`discovery`、`orders` 的调用说明。

### Notes

- `orders` 当前仍为 mock 支付链路，仅用于会员流程调试，正式上线前需要接入真实微信支付能力。
- 当前 AI 文本与生图能力使用 CloudBase AI，不要求在仓库中配置 `OPENAI_API_KEY`。

## v0.1.0

### Added

- 初始化 CloudBase 原生架构
- login 云函数
- songs 云函数
- ai-generate 云函数
- CloudBase 产品文档
- CloudBase API 文档
- CloudBase 数据库设计
- CloudBase 部署文档
- 前端 provider 接入层
- 云数据库集合模板
