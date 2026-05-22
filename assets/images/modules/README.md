# 模块级图片资源

本目录存放谱灵 AI 小程序页面内可复用的模块级 SVG 图片。

## 首页模块

- `hero-ai-song-card.svg`：首页主视觉 Banner 模块。
- `function-grid-ai-write.svg`：AI 写歌功能入口卡片。
- `function-grid-chord.svg`：配和弦功能入口卡片。
- `function-grid-tab.svg`：吉他谱功能入口卡片。
- `function-grid-practice.svg`：练习功能入口卡片。
- `inspiration-card.svg`：今日灵感推荐卡片。

## 曲谱详情模块

- `song-info-card.svg`：曲谱信息卡片，包含调式、BPM、变调夹、难度。
- `song-toolbar.svg`：曲谱工具栏，包含升调、降调、滚谱、节拍器。

## 使用示例

```html
<image src="/assets/images/modules/hero-ai-song-card.svg" mode="widthFix" />
<image src="/assets/images/modules/function-grid-ai-write.svg" mode="aspectFit" />
```

## 说明

这些资源适合直接作为静态图片使用，也可以作为前端组件拆分参考。后续正式开发时，建议将模块重新实现为原生组件，以便支持点击态、动态数据和响应式布局。
