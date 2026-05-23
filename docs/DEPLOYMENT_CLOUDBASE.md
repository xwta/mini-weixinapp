# 谱灵 AI 微信云托管部署方案

## 1. 部署结论

谱灵 AI 采用以下生产部署方案：

```text
微信小程序
   ↓
微信云托管 CloudBase Run
   ↓
FastAPI 后端容器
   ↓
TencentDB MySQL
   ↓
Redis
```

本项目不采用传统云开发数据库 + 云函数方式，避免重写现有 FastAPI/MySQL/Redis 架构。

## 2. 为什么选择微信云托管

当前项目已经具备：

```text
FastAPI 后端
SQLAlchemy
MySQL
Redis
Dockerfile.backend
Dockerfile.frontend
docker-compose.prod.yml
GitHub Actions
```

微信云托管可以继续复用这些能力。

优点：

```text
保留 Python FastAPI 架构
保留 MySQL 关系型数据库
保留 Redis 缓存能力
支持 Docker 容器部署
小程序访问链路更自然
支持 HTTPS 和环境变量
后续可迁移到腾讯云 CVM / 阿里云 / Kubernetes
```

## 3. 云资源规划

### 3.1 云托管服务

建议创建两个服务：

```text
puling-api       FastAPI 后端服务
puling-admin     后续管理后台服务，当前可暂缓
```

小程序前端仍由微信小程序包管理，不需要部署到云托管。

H5 管理后台未来可以单独部署。

### 3.2 数据库

推荐：

```text
TencentDB MySQL 8.0
```

数据库：

```text
puling_ai
```

编码：

```text
utf8mb4
utf8mb4_unicode_ci
```

### 3.3 Redis

推荐：

```text
TencentDB Redis 7.x
```

用途：

```text
AI结果缓存
验证码/登录态缓存
频率限制
推荐缓存
热搜缓存
```

### 3.4 对象存储

推荐：

```text
腾讯云 COS
```

用途：

```text
用户头像
曲谱图片
分享海报
音频 Demo
导出 PDF
```

## 4. 代码部署方式

### 4.1 后端镜像

使用：

```text
docker/Dockerfile.backend
```

构建：

```bash
docker build -f docker/Dockerfile.backend -t puling-api .
```

本地运行：

```bash
docker run -p 8000:8000 --env-file apps/server/.env puling-api
```

### 4.2 云托管启动命令

云托管容器启动命令：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

监听端口：

```text
8000
```

健康检查：

```text
/health
```

## 5. 环境变量

云托管需要配置以下环境变量：

```env
APP_NAME=谱灵AI
APP_ENV=production
DEBUG=false
API_V1_PREFIX=/api/v1

DATABASE_URL=mysql+pymysql://USER:PASSWORD@MYSQL_HOST:3306/puling_ai?charset=utf8mb4
REDIS_URL=redis://REDIS_HOST:6379/0

SECRET_KEY=please-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080

ADMIN_USERNAME=admin
ADMIN_PASSWORD=please-change-admin-password

WECHAT_APPID=your-wechat-appid
WECHAT_SECRET=your-wechat-secret

OPENAI_API_KEY=your-openai-key
AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
```

敏感信息必须放在云托管环境变量或密钥管理中，禁止写入 GitHub。

## 6. 数据库迁移

首次上线前执行：

```bash
cd apps/server
alembic upgrade head
```

云托管环境可以通过一次性任务或临时容器执行迁移。

上线流程建议：

```text
1. 备份数据库
2. 执行 alembic upgrade head
3. 部署新镜像
4. 访问 /health
5. 执行冒烟测试
```

## 7. 小程序接口配置

小程序前端接口配置位置：

```text
apps/miniprogram/src/config/index.ts
```

生产环境需要改为云托管访问地址：

```text
https://你的云托管域名/api/v1
```

微信公众平台需要配置 request 合法域名。

## 8. GitHub Actions 部署建议

推荐流程：

```text
push main
  ↓
运行测试
  ↓
构建 Docker 镜像
  ↓
推送到腾讯云容器镜像服务 TCR
  ↓
触发微信云托管发布
  ↓
健康检查
```

当前仓库已有基础工作流：

```text
.github/workflows/deploy.yml
```

后续需要补充腾讯云密钥：

```text
TENCENT_SECRET_ID
TENCENT_SECRET_KEY
TCR_REGISTRY
TCR_NAMESPACE
CLOUDBASE_ENV_ID
CLOUDBASE_SERVICE_NAME
```

## 9. 推荐环境划分

```text
开发环境：本地 Docker Compose
测试环境：微信云托管 test
生产环境：微信云托管 prod
```

分支建议：

```text
main        生产
staging     测试
feature/*   功能开发
```

## 10. 上线检查

上线前必须确认：

```text
后端 /health 正常
数据库迁移完成
Redis 可连接
小程序合法域名配置完成
微信登录配置完成
AI Key 配置完成
管理员密码已修改
敏感信息未提交到 GitHub
曲谱搜索接口正常
AI 生成接口正常
评论/点赞/收藏接口正常
```

## 11. 后续优化

```text
接入腾讯云 CLS 日志
接入告警
接入 COS 上传
接入微信支付
接入自动扩缩容
接入 CDN
接入灰度发布
```
