# 谱灵 AI FastAPI 后端

本目录为谱灵 AI 微信小程序后端服务，技术栈：

```text
Python 3.11
FastAPI
SQLAlchemy 2.x
Alembic
MySQL 8.0
Redis
```

## 1. 本地启动

### 安装依赖

```bash
cd apps/server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell：

```powershell
cd apps/server
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
DATABASE_URL=mysql+pymysql://puling_user:puling_password@127.0.0.1:3306/puling_ai?charset=utf8mb4
SECRET_KEY=please-change-me
```

### 启动服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

健康检查：

```text
GET http://127.0.0.1:8000/health
```

接口文档：

```text
http://127.0.0.1:8000/docs
```

## 2. 已实现接口

### 认证

```text
POST /api/v1/auth/wechat-login
POST /api/v1/auth/admin-login
GET  /api/v1/users/me
```

### AI 创作

```text
POST /api/v1/ai/songwriting
POST /api/v1/ai/chords
```

### 曲谱

```text
GET    /api/v1/songs/mine
GET    /api/v1/songs/search
GET    /api/v1/songs/{song_id}
POST   /api/v1/songs
DELETE /api/v1/songs/{song_id}
```

### 收藏

```text
GET    /api/v1/favorites
POST   /api/v1/favorites?song_id=1
DELETE /api/v1/favorites/{song_id}
```

### 管理后台

```text
GET   /api/v1/admin/users
GET   /api/v1/admin/songs
PATCH /api/v1/admin/songs/{song_id}/audit
GET   /api/v1/admin/ai-generation-logs
GET   /api/v1/admin/orders
```

## 3. 当前 AI 模式

当前 AI 服务为 mock provider，可以在没有模型 API Key 的情况下跑通前后端联调。

后续替换 `app/services/ai_service.py` 即可接入真实模型。

## 4. 注意事项

- 微信登录目前为 mock 登录，生产环境需要接入微信 `jscode2session`。
- 管理员登录目前使用 `.env` 中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。
- 数据库迁移配置会在后续补充 Alembic 初始化文件。
