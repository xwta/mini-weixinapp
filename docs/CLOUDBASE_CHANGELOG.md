# CloudBase Changelog

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
