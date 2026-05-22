# 按钮级图片资源

本目录存放谱灵 AI 小程序可直接引用的按钮级 SVG 图片。

## 文件清单

- `btn-primary-create.svg`：主按钮，文案为“生成弹唱谱”。
- `btn-primary-practice.svg`：主按钮，文案为“开始练习”。
- `btn-secondary-share.svg`：次按钮，文案为“分享”。
- `btn-small-generate.svg`：小按钮，文案为“生成”。

## 使用示例

```html
<image src="/assets/images/buttons/btn-primary-create.svg" mode="widthFix" />
<image src="/assets/images/buttons/btn-small-generate.svg" mode="aspectFit" />
```

## 说明

按钮 SVG 可以作为视觉稿直接使用。正式开发时建议使用原生按钮组件实现，以便支持点击态、禁用态、加载态和可访问性。
