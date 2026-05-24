function createAgent(name, run) {
  return { name, run }
}

const agents = {
  'lyrics-agent': createAgent('lyrics-agent', async (ctx, tools) => {
    return tools.callSongGeneration(ctx.event, ctx.intent)
  }),

  'chord-agent': createAgent('chord-agent', async (ctx, tools) => {
    return tools.callSongGeneration(ctx.event, ctx.intent)
  }),

  'search-agent': createAgent('search-agent', async (ctx, tools) => {
    return tools.callSongSearch(ctx.event)
  }),

  'recommend-agent': createAgent('recommend-agent', async (ctx, tools) => {
    return tools.callRecommendation(ctx.event)
  }),

  'practice-agent': createAgent('practice-agent', async (ctx, tools) => {
    return tools.buildPracticePlan(ctx.event)
  }),

  'profile-agent': createAgent('profile-agent', async (ctx) => {
    return {
      code: 0,
      data: {
        profileHint: 'profile-ready',
        openid: ctx.openid,
      },
    }
  }),

  'social-agent': createAgent('social-agent', async () => {
    return {
      code: 0,
      data: {
        message: '社区操作已识别，可继续执行收藏、点赞、关注或评论。',
        nextAction: 'social',
      },
    }
  }),

  'result-agent': createAgent('result-agent', async (ctx) => {
    return {
      code: 0,
      data: {
        message: '我已经理解你的需求，可以继续帮你写歌、搜谱、配和弦或制定练习计划。',
        intent: ctx.intent,
        nextAction: 'chat',
      },
    }
  }),
}

function pickExecutableAgents(workflow = []) {
  return workflow.filter((name) => agents[name] && name !== 'intent-router')
}

module.exports = {
  agents,
  pickExecutableAgents,
}
