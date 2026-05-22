# 谱灵 AI 小程序前端

这是谱灵 AI 微信小程序前端项目，基于 uni-app + Vue3 实现。

## 技术栈

```text
uni-app
Vue 3
Vite
TypeScript
SCSS
```

## 目录结构

```text
apps/miniprogram/
├── src/
│   ├── api/                 接口封装
│   ├── components/          公共组件
│   ├── config/              应用配置
│   ├── pages/               页面
│   ├── stores/              状态管理
│   ├── styles/              全局主题样式
│   ├── types/               类型定义
│   ├── utils/               工具函数
│   ├── App.vue
│   ├── main.ts
│   ├── manifest.json
│   └── pages.json
├── package.json
├── vite.config.ts
└── index.html
```

## 已实现页面

```text
pages/home/index           首页
pages/create/index         AI 创作页
pages/songs/index          曲谱库 / 我的作品
pages/song-detail/index    曲谱详情页
pages/profile/index        我的页面
pages/favorites/index      我的收藏页
```

## 已接入接口

```text
POST /api/v1/auth/wechat-login
GET  /api/v1/users/me
POST /api/v1/ai/songwriting
POST /api/v1/ai/chords
GET  /api/v1/songs/mine
GET  /api/v1/songs/search
GET  /api/v1/songs/{song_id}
GET  /api/v1/favorites
POST /api/v1/favorites
DELETE /api/v1/favorites/{song_id}
```

## 本地运行

安装依赖：

```bash
cd apps/miniprogram
npm install
```

运行微信小程序：

```bash
npm run dev:mp-weixin
```

构建微信小程序：

```bash
npm run build:mp-weixin
```

## 后端接口地址

当前配置在：

```text
src/config/index.ts
```

默认：

```text
http://127.0.0.1:8000/api/v1
```

如果真机调试，需要把它改成局域网 IP 或线上域名，例如：

```text
http://192.168.1.10:8000/api/v1
```

## 当前说明

当前小程序已经完成真实项目级别的基础闭环：

```text
首页 → AI 创作 → 登录 → 调用后端生成 → 保存曲谱 → 跳转曲谱详情 → 收藏 → 我的作品/收藏
```

后续可继续补：

- 静态资源迁移到 `static/`
- 真机调试域名配置
- 分享海报
- 自动滚谱正式实现
- 会员中心与支付页面
- 管理后台 Web 页面
