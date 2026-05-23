# 谱灵 AI CloudBase 原生版产品方案

## 1. 分支定位

`cloudbase-native` 分支用于实现微信小程序云开发原生版本。

该分支不替代 `main` 分支。

```text
main
  FastAPI + MySQL + Redis + 微信云托管

cloudbase-native
  微信云函数 + 云数据库 + 云存储
```

## 2. 适用场景

CloudBase 原生版适合：

```text
快速上线 MVP
降低服务器运维成本
优先适配微信生态
小团队快速验证产品
```

不适合：

```text
复杂推荐算法
高并发社区
复杂后台系统
重度数据分析
跨端 API 服务
```

## 3. 功能范围

P0：

```text
微信登录
搜谱
曲谱详情
手动建谱
AI 生成
收藏
```

P1：

```text
点赞
评论
关注
用户主页
```

P2：

```text
通知
动态流
推荐算法
会员支付
```

## 4. 页面结构

```text
首页
搜谱
创作
曲谱详情
练习模式
我的
用户主页
消息中心
```

## 5. 调用方式差异

```text
main 分支：HTTP REST API
cloudbase-native 分支：wx.cloud.callFunction
```

## 6. 核心链路

登录：

```text
小程序打开
  ↓
调用 login 云函数
  ↓
获取 openid
  ↓
创建或更新用户
```

搜谱：

```text
搜谱页
  ↓
调用 songs 云函数 action=search
  ↓
查询 songs 集合
```

手动建谱：

```text
创作页
  ↓
调用 songs 云函数 action=manualCreate
  ↓
保存 raw_text 和结构化曲谱
```

AI 生成：

```text
创作页
  ↓
调用 ai-generate 云函数
  ↓
生成曲谱
  ↓
保存 songs 集合
```
