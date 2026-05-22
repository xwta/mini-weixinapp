# 谱灵 AI 技术栈方案 V1.0

## 1. 技术栈结论

后端正式采用：

```text
Python + FastAPI + MySQL 8.0 + Redis + Celery/RQ
```

相比 Node.js / NestJS，Python 更适合本项目的 AI 生成、提示词编排、内容审核、音频分析和后续模型能力扩展。数据库选择 MySQL 8.0，适合用户、订单、会员、曲谱、收藏等稳定业务数据场景。

## 2. 推荐架构

```text
小程序前端：uni-app / Vue3
后端 API：Python / FastAPI
数据库：MySQL 8.0
ORM：SQLAlchemy 2.x
数据迁移：Alembic
缓存：Redis
异步任务：Celery 或 RQ
对象存储：腾讯云 COS / 阿里云 OSS
支付：微信支付 API
AI 能力：OpenAI / 通义千问 / DeepSeek / Claude 等
部署：Docker + Nginx + 云服务器
```

## 3. 为什么后端用 Python

### 3.1 更适合 AI 产品

谱灵 AI 的核心不是普通 CRUD，而是：

- AI 写歌
- AI 配和弦
- AI 改编
- 内容审核
- 后续音频扒谱
- 哼唱识别
- 旋律分析

Python 在 AI、音频处理、文本生成、模型调用和数据处理方面生态更完整。

### 3.2 后续扩展更自然

未来如果做音频能力，可以直接接入：

```text
librosa
madmom
basic-pitch
demucs
pydub
ffmpeg-python
```

如果继续用 Node.js，音频和模型分析层很可能最后还是要拆 Python 服务。

### 3.3 项目结构更轻

FastAPI 的优势：

- API 开发快
- 自动生成 OpenAPI 文档
- 类型提示清晰
- 异步支持好
- 适合 AI 接口代理与任务编排

## 4. 为什么数据库选 MySQL

MySQL 适合本项目首版商业化需求：

- 用户体系稳定
- 订单支付成熟
- 会员与次数包容易建模
- 曲谱、收藏、生成记录都是典型关系数据
- 团队与云服务支持更普遍
- 部署、备份、迁移成本较低

推荐版本：

```text
MySQL 8.0+
字符集：utf8mb4
排序规则：utf8mb4_unicode_ci
时区：Asia/Shanghai 或 UTC 统一转换
```

## 5. 后端目录建议

```text
apps/server/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── errors.py
│   ├── api/
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── ai.py
│   │       ├── songs.py
│   │       ├── favorites.py
│   │       ├── orders.py
│   │       └── payments.py
│   ├── models/
│   │   ├── user.py
│   │   ├── song.py
│   │   ├── favorite.py
│   │   ├── order.py
│   │   └── ai_generation_log.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── song.py
│   │   ├── ai.py
│   │   └── order.py
│   ├── services/
│   │   ├── ai_service.py
│   │   ├── prompt_service.py
│   │   ├── song_service.py
│   │   ├── payment_service.py
│   │   └── content_safety_service.py
│   ├── workers/
│   │   ├── celery_app.py
│   │   └── tasks.py
│   └── utils/
│       ├── response.py
│       └── validators.py
├── migrations/
├── tests/
├── pyproject.toml
├── requirements.txt
├── Dockerfile
└── README.md
```

## 6. 核心模块职责

| 模块 | 职责 |
|---|---|
| auth | 微信登录、JWT 签发 |
| users | 用户信息、会员状态、生成次数 |
| ai | AI 写歌、配和弦、改编、分享文案 |
| songs | 曲谱保存、详情、搜索、删除 |
| favorites | 收藏与取消收藏 |
| orders | 套餐、订单、支付状态 |
| payments | 微信支付、回调验签 |
| content_safety | 版权风险、敏感词、违规内容检测 |
| workers | 异步任务、长耗时 AI 生成 |

## 7. MVP 后端优先级

### P0

- FastAPI 项目初始化
- 环境变量配置
- MySQL 数据库连接
- Alembic 迁移配置
- 用户模型
- 微信登录接口
- AI 写歌接口
- AI 配和弦接口
- 曲谱保存与详情
- 我的作品
- 收藏接口
- 生成次数限制

### P1

- 分享文案生成
- 自动滚谱参数保存
- 练习记录
- 订单创建
- 微信支付回调
- 会员/次数包

### P2

- 后台管理
- 内容审核队列
- 音频扒谱
- 哼唱识别
- 原创广场

## 8. 推荐依赖

```text
fastapi
uvicorn[standard]
sqlalchemy
alembic
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
httpx
redis
celery
pymysql
python-multipart
loguru
pytest
```

## 9. MySQL 连接示例

```text
mysql+pymysql://puling_user:puling_password@127.0.0.1:3306/puling_ai?charset=utf8mb4
```

环境变量建议：

```env
DATABASE_URL=mysql+pymysql://puling_user:puling_password@mysql:3306/puling_ai?charset=utf8mb4
REDIS_URL=redis://redis:6379/0
```

## 10. 结论

本项目后端建议正式切换为 Python + FastAPI，数据库选择 MySQL 8.0。

原因：

```text
AI 能力更好扩展
音频能力更好接入
项目启动更快
API 文档天然友好
MySQL 适合用户、订单、会员、曲谱等核心业务数据
```
