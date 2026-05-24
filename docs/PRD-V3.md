# 谱灵 AI V3 产品需求文档

## 1. 产品定位

谱灵 AI V3 的定位从“AI 吉他谱生成工具”升级为“AI 吉他伙伴”。它不只回答用户问题，而是持续理解用户的创作、练习、收藏、社区互动和音乐偏好，主动提供下一步建议。

核心身份：

```text
AI 吉他创作助手
AI 吉他练习教练
AI 曲谱社区推荐官
AI 音乐学习陪伴者
```

## 2. V3 目标

| 目标 | 说明 |
|---|---|
| 智能化 | 从单次 AI 生成升级为多智能体协作工作流 |
| 个性化 | 根据用户兴趣、水平、行为生成推荐与练习方案 |
| 社区化 | 推荐流不再依赖静态排序，而是基于真实行为评分 |
| 可解释 | 推荐理由、练习建议、生成结果都能解释来源 |
| 可迭代 | Router、Agent、Recommendation Service 可独立演进 |

## 3. 核心用户

### 3.1 新手吉他用户

诉求：

```text
想快速找到适合自己的歌
看不懂复杂和弦
希望有人告诉我今天练什么
```

关键能力：

```text
难度识别
简化和弦
练习计划
适合当前水平推荐
```

### 3.2 弹唱创作者

诉求：

```text
有一句灵感，希望变成歌词和和弦
想模仿某种风格
想快速生成可发布曲谱
```

关键能力：

```text
Lyrics Agent
Chord Agent
Arrangement Agent
Publish Assistant
```

### 3.3 社区浏览用户

诉求：

```text
想发现好听、好练、适合自己的谱
想收藏、点赞、关注作者
```

关键能力：

```text
兴趣画像
曲谱推荐
作者推荐
热门趋势
```

## 4. 产品主流程

### 4.1 谱灵首页智能输入

用户输入自然语言：

```text
帮我写一首五月天风格的民谣
找一首适合新手的周杰伦歌曲
给这段歌词配和弦
今天练什么
```

系统流程：

```text
Input
  ↓
Intent Router
  ↓
Agent Workflow
  ↓
Result Aggregator
  ↓
Song / Practice / Recommend Result
  ↓
Save / Practice / Publish
```

### 4.2 社区真实推荐

社区不再只是静态列表，而是基于用户行为和内容质量生成推荐。

推荐理由示例：

```text
因为你最近收藏了「民谣」曲谱
因为你练过 C-G-Am-F 和弦
因为这首歌适合新手
因为这首曲谱最近收藏增长很快
```

### 4.3 练习闭环

```text
AI 生成曲谱
  ↓
难度分析
  ↓
生成练习任务
  ↓
记录练习
  ↓
更新用户画像
  ↓
影响后续推荐
```

## 5. V3 功能范围

### 5.1 AI Router

负责识别用户意图，并分发到对应 Agent。

支持意图：

| 意图 | 示例 | Agent |
|---|---|---|
| songwriting | 写一首民谣 | Lyrics Agent + Chord Agent |
| chord_matching | 给歌词配和弦 | Chord Agent |
| song_search | 找晴天的谱 | Search Agent |
| practice_plan | 今天练什么 | Practice Agent |
| recommendation | 推荐适合我的歌 | Recommend Agent |
| community_action | 收藏、点赞、关注 | Social Agent |

### 5.2 Agent Workflow

Agent 不直接面对页面，而是由 Router 调度。

```text
IntentRouter
  ↓
ContextBuilder
  ↓
AgentExecutor
  ↓
ResultAggregator
  ↓
PersistenceService
```

### 5.3 Recommendation Service

推荐由多路召回 + 重排序组成。

召回来源：

```text
热门曲谱
最新曲谱
用户兴趣相似曲谱
当前水平适配曲谱
关注作者曲谱
最近上升曲谱
```

重排序因素：

```text
收藏数
点赞数
练习次数
评论数
发布时间
用户兴趣匹配度
用户技能匹配度
内容质量分
```

### 5.4 用户画像

用户画像来自行为，不要求用户手动填写。

```text
收藏 → 兴趣标签
点赞 → 偏好强度
练习 → 技能水平
搜索 → 即时意图
生成 → 创作偏好
关注 → 作者偏好
```

## 6. 数据模型新增

V3 建议新增集合：

```text
user_profiles
user_actions
recommendation_logs
agent_runs
song_features
```

### 6.1 user_profiles

```json
{
  "user_id": "string",
  "openid": "string",
  "skill_level": "beginner",
  "interest_tags": ["民谣", "五月天", "C调"],
  "favorite_artists": ["五月天", "周杰伦"],
  "preferred_keys": ["C", "G", "Am"],
  "updated_at": 0
}
```

### 6.2 user_actions

```json
{
  "user_id": "string",
  "action": "like | favorite | practice | search | generate | view",
  "target_type": "song | user | keyword",
  "target_id": "string",
  "weight": 1,
  "created_at": 0
}
```

### 6.3 agent_runs

```json
{
  "user_id": "string",
  "intent": "songwriting",
  "agents": ["lyrics", "chord", "practice"],
  "input": "string",
  "output_summary": "string",
  "status": "success | failed",
  "created_at": 0
}
```

## 7. 推荐评分 V1

第一版不做复杂深度学习，采用可解释加权模型。

```text
score =
  favoriteScore * 0.35 +
  likeScore * 0.25 +
  practiceScore * 0.20 +
  freshnessScore * 0.10 +
  interestScore * 0.10
```

其中：

```text
favoriteScore: 收藏数归一化
likeScore: 点赞数归一化
practiceScore: 练习次数归一化
freshnessScore: 时间衰减热度
interestScore: 用户画像标签匹配
```

## 8. 成功指标

| 指标 | 目标 |
|---|---|
| AI 输入转化率 | 用户输入后产生有效结果 |
| 曲谱保存率 | AI 结果被保存为曲谱 |
| 练习启动率 | 用户从曲谱进入练习 |
| 推荐点击率 | 社区推荐卡片点击 |
| 收藏率 | 推荐曲谱被收藏 |
| 次日留存 | 用户第二天继续练习或浏览 |

## 9. 里程碑

### Phase 1: 文档和后端骨架

```text
PRD-V3
AI Router
Agent Workflow Skeleton
Recommendation Service Skeleton
```

### Phase 2: 真实推荐

```text
用户行为采集
推荐评分
社区推荐流接入
推荐理由展示
```

### Phase 3: 智能体闭环

```text
Lyrics Agent
Chord Agent
Practice Agent
Recommend Agent
Agent Run Log
```

### Phase 4: 个性化学习

```text
用户画像自动更新
练习反馈进入画像
推荐策略迭代
```

## 10. 非目标

V3 当前不做：

```text
完整音频识别
真实微信支付结算
复杂向量数据库依赖
跨端 App
重型后台管理系统
```

这些能力可以作为后续版本演进。