# 谱灵 AI UI 开发规则

## 1. 目标

本文档用于保证 V2 UI 设计图可以在微信小程序中尽量 1:1 还原。

核心原则：

```text
不要按截图目测开发
不要使用随机数值
不要大量绝对定位
统一使用设计 Token 和组件规范
```

## 2. 设计基准

```text
设计稿宽度：750px
小程序单位：rpx
换算关系：750px = 750rpx
布局体系：8pt 栅格
```

所有页面默认使用：

```text
page width = 750rpx
safe content width = 686rpx
page horizontal padding = 32rpx
```

## 3. 页面通用布局

页面根节点：

```text
width: 750rpx
min-height: 100vh
background: #F6FBF8 或 #FFFFFF
```

页面内容区：

```text
padding-left: 32rpx
padding-right: 32rpx
```

模块间距：

```text
小间距：8rpx
中间距：16rpx
标准间距：24rpx
大间距：32rpx
```

## 4. 卡片规范

标准卡片：

```text
width: 686rpx
border-radius: 24rpx
padding: 24rpx
background: #FFFFFF
border: 1rpx solid #E8EFEA
box-shadow: 0 8rpx 28rpx rgba(18, 52, 36, 0.06)
```

轻卡片：

```text
border-radius: 20rpx
padding: 20rpx
background: #FFFFFF
border: 1rpx solid #EDF3EF
```

## 5. 字体规范

```text
页面标题：36rpx / 700
模块标题：32rpx / 700
正文：28rpx / 400
辅助文字：24rpx / 400
说明文字：22rpx / 400
```

颜色：

```text
主标题：#17231E
正文：#2B3731
辅助：#6B756F
弱提示：#A4AEA8
```

## 6. 按钮规范

主按钮：

```text
height: 72rpx
padding: 0 32rpx
border-radius: 999rpx
background: #0BA45A
color: #FFFFFF
font-size: 28rpx
font-weight: 600
```

次按钮：

```text
height: 64rpx
padding: 0 28rpx
border-radius: 999rpx
background: #FFFFFF
border: 1rpx solid #E1EAE5
color: #17231E
font-size: 26rpx
```

图标按钮：

```text
width: 72rpx
height: 72rpx
border-radius: 50%
background: #FFFFFF
border: 1rpx solid #E8EFEA
```

## 7. 底部 Tab Bar

一级 Tab 仅允许：

```text
谱灵
社区
我的
```

记录页不是一级 Tab，必须作为谱灵首页的二级页面进入。

Tab Bar：

```text
height: 112rpx
background: #FFFFFF
border-top: 1rpx solid #E8EFEA
```

## 8. 页面层级

一级页面：

```text
谱灵首页
社区首页
我的首页
```

二级页面：

```text
谱灵记录页
社区搜索页
曲谱详情页
练习模式页
发布作品页
```

三级页面：

```text
话题详情页
用户主页
消息详情页
设置详情页
```

## 9. 禁止事项

```text
禁止使用 px 作为主要布局单位
禁止按照截图随意估算间距
禁止在页面里写大量魔法数字
禁止把记录页放到底部 Tab
禁止把整张 UI 图当背景图使用
禁止用绝对定位堆页面
```

## 10. 推荐开发流程

```text
1. 先读取 DESIGN_TOKEN.md
2. 再拆组件
3. 再组合页面
4. 最后对照 UI 图微调
```

开发顺序：

```text
Token
  ↓
基础组件
  ↓
业务组件
  ↓
一级页面
  ↓
二级页面
```
