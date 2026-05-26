# 谱灵 AI 小程序发布检查清单

## 1. 拉取最新代码

```bat
cd /d D:\ai\mini-weixinapp
git pull origin cloudbase-native
```

## 2. 发布前自检

```bat
python tools\preflight_release_check.py
```

自检脚本会检查：

- 关键页面是否存在
- 关键云函数目录是否存在
- 正式版功能开关是否符合审核版配置
- 麦克风权限说明是否配置
- 页面中是否残留测试版、debug、TODO 等文案

## 3. 功能开关

配置文件：

```text
apps/miniprogram/src/config/features.ts
```

审核推荐配置：

```ts
SHOW_COMMUNITY: false
SHOW_COMMENTS: false
SHOW_EXTERNAL_LINK: false
SHOW_DEBUG_INFO: false
ENABLE_TAB_SEARCH: true
ENABLE_IMAGE_PREVIEW: true
ENABLE_TEXT_IMPORT: true
ENABLE_AI_GENERATE: true
ENABLE_TUNER: true
ENABLE_ORDERS: false
ENABLE_NOTIFICATIONS: false
ENABLE_MEMBERSHIP: true
```

## 4. 部署云函数

```bat
cd /d D:\ai\mini-weixinapp\cloudbase
tcb fn deploy web-search
tcb fn deploy resource-preview
tcb fn deploy resource-tab-import
tcb fn deploy ai-generate
tcb fn deploy songs
```

如果使用旧命令也可以：

```bat
tcb functions:deploy web-search
tcb functions:deploy resource-preview
tcb functions:deploy resource-tab-import
tcb functions:deploy ai-generate
tcb functions:deploy songs
```

## 5. 构建小程序

```bat
cd /d D:\ai\mini-weixinapp\apps\miniprogram
npm run build:mp-weixin
```

## 6. 微信开发者工具

1. 导入或打开 `apps/miniprogram/dist/build/mp-weixin`
2. 工具 → 清缓存 → 清除全部缓存
3. 编译
4. 真机预览

## 7. 真机测试路径

### 搜谱

- 搜索 `晴天`
- 搜索 `成都`
- 搜索 `海阔天空`
- 检查图片谱是否可以预览
- 检查文本谱是否可以导入
- 检查导入后是否进入曲谱详情

### 曲谱详情

- 升调
- 降调
- 恢复原调
- 开始练习
- 检查练习页是否继承转调

### 调音器

- 进入底部调音页面
- 点击开始调音
- 授权麦克风
- 拨 6 弦、5 弦、1 弦
- 检查偏高、偏低、音准良好提示
- 播放标准音

### 我的

- 最近搜索是否展示
- 最近导入是否展示
- 点击最近导入是否进入曲谱详情
- 点击最近搜索是否自动回到搜谱页并搜索

## 8. 审核注意事项

- 社区模块默认隐藏
- 评论模块默认隐藏
- 外部链接默认不直接打开
- 图片谱仅预览
- 文本谱导入为个人练习曲谱
- AI 编配不要宣称原版曲谱
- 麦克风权限说明仅用于调音识别

## 9. 常见问题

### 云函数提示服务未部署

重新部署对应函数：

```bat
tcb fn deploy 函数名
```

### 搜谱超时

通常是网络或百度返回慢，前端已自动重试一次。可以再次搜索或换更完整关键词，例如：

```text
晴天 周杰伦
成都 赵雷
海阔天空 Beyond
```

### 图片谱不能预览

确认已部署：

```bat
tcb fn deploy resource-preview
```

### 文本谱不能导入

确认已部署：

```bat
tcb fn deploy resource-tab-import
```

### 调音器无法启动

- 真机测试，不以模拟器为准
- 检查微信麦克风权限
- 检查 `manifest.json` 是否包含 `scope.record.desc`
