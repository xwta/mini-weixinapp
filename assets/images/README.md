# 图片资源说明

本目录存放谱灵 AI 小程序可直接引用的页面级图片资源。

## 页面图

路径：`assets/images/pages/`

- `home-page.svg`：首页页面图。
- `ai-create-page.svg`：AI 创作页页面图。
- `song-detail-page.svg`：曲谱详情页页面图。

## 使用建议

这些 SVG 可以作为设计预览图、空状态展示图、落地页宣传图，也可以作为前端开发参考。

```html
<image src="/assets/images/pages/home-page.svg" mode="widthFix" />
<image src="/assets/images/pages/ai-create-page.svg" mode="widthFix" />
<image src="/assets/images/pages/song-detail-page.svg" mode="widthFix" />
```

## 目录说明

```text
assets/images/pages/   页面级图片
assets/logo/           Logo 与图标
```

## PNG 导出建议

如果微信开发者工具对 SVG 支持不稳定，可以将 SVG 导出为 PNG：

```text
home-page.png          390 x 844
ai-create-page.png     390 x 844
song-detail-page.png   390 x 844
```

后续进入代码开发时，可以使用脚本批量转换为 PNG。
