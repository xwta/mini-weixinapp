# 谱灵 AI UI 设计图与前端资产

本目录存放谱灵 AI 微信小程序的轻量 UI 设计图，采用白底、绿色主色、清爽音乐工具风格。

## 设计资产

### Logo

- `assets/logo/puling-logo.svg`：横版品牌 Logo，可用于首页、README、启动页顶部。
- `assets/logo/puling-icon.svg`：App 图标 / 小程序图标候选，可用于头像、入口图标、占位图。

### 页面设计图

- `design/home-page.svg`：首页 UI 预览图。
- `design/ai-create-page.svg`：AI 创作页 UI 预览图。
- `design/song-detail-page.svg`：曲谱详情页 UI 预览图。

## 前端使用方式

小程序可以直接将 SVG 作为图片资源引用，也可以后续转换为 PNG。

示例：

```html
<image src="/assets/logo/puling-icon.svg" mode="aspectFit" />
```

如果微信开发者工具对 SVG 兼容不稳定，建议导出 PNG：

```text
puling-icon.png       256x256
puling-logo.png       720x220
home-page.png         390x844
ai-create-page.png    390x844
song-detail-page.png  390x844
```

## 视觉方向

- 背景：白色 / 浅纸白
- 主色：品牌绿 `#1E7A5A`
- 辅助：浅薄荷绿 `#E8F7F0`、奶油黄 `#FFF3CF`
- 气质：年轻、清爽、AI 创作感、音乐练习感

## 后续建议

1. 基于当前 SVG 设计图拆成小程序组件。
2. 将首页、AI 创作页、曲谱详情页先开发成静态页面。
3. 再接入真实 AI 生成接口。
4. 后续补充我的页面、会员中心、练习模式页设计图。
