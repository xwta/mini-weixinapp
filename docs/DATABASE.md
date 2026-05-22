# 谱灵 AI 小程序数据库设计 V1.0

## 1. 设计说明

数据库用于支撑用户、AI 生成、曲谱、收藏、练习记录、订单、会员和内容审核等核心业务。

推荐数据库：MySQL 8.0 或 PostgreSQL。

本文示例以 MySQL 为主。

## 2. 表结构总览

```text
users                  用户表
songs                  曲谱/作品表
favorites              收藏表
ai_generation_logs     AI 生成记录表
practice_records       练习记录表
products               商品套餐表
orders                 订单表
payment_logs           支付日志表
content_reports        举报表
audit_logs             审核日志表
prompt_templates       AI 提示词模板表
```

## 3. users 用户表

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(100) NOT NULL UNIQUE,
  unionid VARCHAR(100),
  nickname VARCHAR(100),
  avatar_url TEXT,
  membership_type VARCHAR(50) DEFAULT 'free',
  membership_expired_at DATETIME,
  generation_quota INT DEFAULT 3,
  daily_free_quota INT DEFAULT 3,
  total_generated INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

索引建议：

```sql
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_membership ON users(membership_type);
```

## 4. songs 曲谱/作品表

```sql
CREATE TABLE songs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  title VARCHAR(255) NOT NULL,
  author_name VARCHAR(100),
  style VARCHAR(100),
  song_key VARCHAR(20),
  bpm INT,
  capo VARCHAR(50),
  difficulty VARCHAR(50),
  strumming VARCHAR(255),
  chords_json JSON,
  content_json JSON,
  source_type VARCHAR(50) DEFAULT 'ai',
  is_public BOOLEAN DEFAULT FALSE,
  audit_status VARCHAR(50) DEFAULT 'pending',
  favorite_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  practice_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME
);
```

字段说明：

| 字段 | 说明 |
|---|---|
| source_type | ai / user_upload / official |
| audit_status | pending / approved / rejected |
| content_json | 曲谱正文，包含段落、歌词、和弦 |
| chords_json | 和弦列表 |

索引建议：

```sql
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_public_audit ON songs(is_public, audit_status);
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_created_at ON songs(created_at);
```

## 5. favorites 收藏表

```sql
CREATE TABLE favorites (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  song_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_song (user_id, song_id)
);
```

## 6. ai_generation_logs AI 生成记录表

```sql
CREATE TABLE ai_generation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  song_id BIGINT,
  generation_type VARCHAR(50),
  input_text TEXT,
  input_params JSON,
  output_json JSON,
  model_name VARCHAR(100),
  prompt_version VARCHAR(50),
  token_usage INT DEFAULT 0,
  cost_amount DECIMAL(10,4) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

字段说明：

| generation_type | 说明 |
|---|---|
| songwriting | AI 写歌 |
| chords | AI 配和弦 |
| rewrite | AI 改编 |
| share_copy | 分享文案 |

## 7. practice_records 练习记录表

```sql
CREATE TABLE practice_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  song_id BIGINT NOT NULL,
  duration_seconds INT DEFAULT 0,
  bpm INT,
  scroll_speed INT,
  practiced_sections JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 8. products 商品套餐表

```sql
CREATE TABLE products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  product_type VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  generation_quota INT DEFAULT 0,
  membership_days INT DEFAULT 0,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

初始化商品示例：

```sql
INSERT INTO products (product_code, name, product_type, price, generation_quota, membership_days, description)
VALUES
('pack_5', '5 次 AI 生成包', 'quota_pack', 3.90, 5, 0, '适合轻量体验'),
('pack_20', '20 次 AI 创作包', 'quota_pack', 9.90, 20, 0, '适合短期创作'),
('vip_month', '月会员', 'membership', 19.90, 300, 30, '每月 300 次 AI 生成'),
('vip_year', '年会员', 'membership', 99.00, 5000, 365, '每年 5000 次 AI 生成');
```

## 9. orders 订单表

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  order_no VARCHAR(100) NOT NULL UNIQUE,
  product_type VARCHAR(50),
  amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'wechat',
  transaction_id VARCHAR(100),
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

支付状态：

```text
pending / paid / failed / refunded / closed
```

## 10. payment_logs 支付日志表

```sql
CREATE TABLE payment_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT,
  order_no VARCHAR(100),
  transaction_id VARCHAR(100),
  notify_payload JSON,
  verify_status VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 11. content_reports 举报表

```sql
CREATE TABLE content_reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  reporter_user_id BIGINT NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id BIGINT NOT NULL,
  reason VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  handled_at DATETIME
);
```

## 12. audit_logs 审核日志表

```sql
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_user_id BIGINT,
  target_type VARCHAR(50) NOT NULL,
  target_id BIGINT NOT NULL,
  audit_status VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 13. prompt_templates 提示词模板表

```sql
CREATE TABLE prompt_templates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  version VARCHAR(50) DEFAULT 'v1',
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 14. 关键业务关系

```text
users 1 - N songs
users 1 - N favorites
songs 1 - N favorites
users 1 - N ai_generation_logs
songs 1 - N ai_generation_logs
users 1 - N practice_records
songs 1 - N practice_records
users 1 - N orders
products 1 - N orders
```

## 15. 数据安全建议

- openid、unionid 不应暴露给前端。
- 支付回调原始数据应完整存储到 payment_logs。
- AI 输入与输出需要保留，方便排查争议内容。
- 用户删除作品建议先软删除。
- 管理后台操作必须记录 audit_logs。
