const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const agentRuns = db.collection('agent_runs')

const INTENTS = {
  SONGWRITING: 'songwriting',
  CHORD_MATCHING: 'chord_matching',
  SONG_SEARCH: 'song_search',
  PRACTICE_PLAN: 'practice_plan',
  RECOMMENDATION: 'recommendation',
  COMMUNITY_ACTION: 'community_action',
  UNKNOWN: 'unknown',
}

function normalizeText(value = '') {
  return String(value || '').trim()
}

function detectIntent(input = '', explicitIntent = '') {
  const text = normalizeText(`${explicitIntent} ${input}`).toLowerCase()

  if (/配和弦|和弦|chord/.test(text)) return INTENTS.CHORD_MATCHING
  if (/练习|训练|practice|今天练什么/.test(text)) return INTENTS.PRACTICE_PLAN
  if (/推荐|适合我|猜你喜欢|recommend/.test(text)) return INTENTS.RECOMMENDATION
  if (/搜索|搜谱|找|search/.test(text)) return INTENTS.SONG_SEARCH
  if (/点赞|收藏|关注|评论|发布/.test(text)) return INTENTS.COMMUNITY_ACTION
  if (/写歌|歌词|创作|生成|song|lyrics/.test(text)) return INTENTS.SONGWRITING

  return explicitIntent || INTENTS.SONGWRITING
}

function buildWorkflow(intent) {
  const workflows = {
    [INTENTS.SONGWRITING]: ['intent-router', 'lyrics-agent', 'chord-agent', 'practice-agent', 'result-agent'],
    [INTENTS.CHORD_MATCHING]: ['intent-router', 'chord-agent', 'practice-agent', 'result-agent'],
    [INTENTS.SONG_SEARCH]: ['intent-router', 'search-agent', 'recommend-agent', 'result-agent'],
    [INTENTS.PRACTICE_PLAN]: ['intent-router', 'practice-agent', 'profile-agent', 'result-agent'],
    [INTENTS.RECOMMENDATION]: ['intent-router', 'profile-agent', 'recommend-agent', 'result-agent'],
    [INTENTS.COMMUNITY_ACTION]: ['intent-router', 'social-agent', 'result-agent'],
  }

  return workflows[intent] || ['intent-router', 'result-agent']
}

async function callSongGeneration(event, intent) {
  const type = intent === INTENTS.CHORD_MATCHING ? 'chords' : 'songwriting'
  const result = await cloud.callFunction({
    name: 'ai-generate',
    data: {
      ...event,
      type,
      prompt: event.prompt || event.input || '',
      lyrics: event.lyrics || event.input || '',
    },
  })

  return result.result || result
}

async function callSongSearch(event) {
  const result = await cloud.callFunction({
    name: 'songs',
    data: {
      action: 'search',
      keyword: event.keyword || event.input || event.prompt || '',
      page: event.page || 1,
      pageSize: event.pageSize || 10,
    },
  })

  return result.result || result
}

async function callRecommendation(event) {
  const result = await cloud.callFunction({
    name: 'discovery',
    data: {
      action: 'recommend',
      limit: event.limit || 10,
    },
  })

  return result.result || result
}

function buildPracticePlan(event) {
  const input = event.input || event.prompt || 'C G Am F 和弦转换'
  return {
    code: 0,
    data: {
      title: '今日练习计划',
      focus: input,
      duration: 15,
      steps: [
        '2分钟慢速热身，保持右手节奏稳定。',
        '5分钟单独练习目标和弦转换。',
        '5分钟加入节拍器，从60BPM开始。',
        '3分钟完整弹唱一遍并记录卡顿位置。',
      ],
      nextAction: 'practice',
    },
  }
}

async function logAgentRun(payload) {
  try {
    await agentRuns.add({
      data: {
        ...payload,
        created_at: new Date(),
      },
    })
  } catch (error) {
    console.warn('agent run log skipped:', error?.message || error)
  }
}

async function executeWorkflow(event, intent) {
  if (intent === INTENTS.SONGWRITING || intent === INTENTS.CHORD_MATCHING) {
    return callSongGeneration(event, intent)
  }

  if (intent === INTENTS.SONG_SEARCH) {
    return callSongSearch(event)
  }

  if (intent === INTENTS.RECOMMENDATION) {
    return callRecommendation(event)
  }

  if (intent === INTENTS.PRACTICE_PLAN) {
    return buildPracticePlan(event)
  }

  return {
    code: 0,
    data: {
      message: '我已经理解你的需求，可以继续帮你写歌、搜谱、配和弦或制定练习计划。',
      nextAction: 'chat',
    },
  }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || 'debug-openid'
  const input = normalizeText(event.input || event.prompt || event.keyword || event.lyrics || '')
  const intent = detectIntent(input, event.intent)
  const workflow = buildWorkflow(intent)

  try {
    const result = await executeWorkflow({ ...event, input }, intent)

    await logAgentRun({
      openid,
      intent,
      input,
      agents: workflow,
      status: result.code === 0 ? 'success' : 'failed',
      output_summary: result?.data?.title || result?.data?.message || result?.message || '',
    })

    return {
      code: result.code || 0,
      data: {
        intent,
        workflow,
        result: result.data || result.result || result,
      },
      message: result.message || 'ok',
    }
  } catch (error) {
    await logAgentRun({
      openid,
      intent,
      input,
      agents: workflow,
      status: 'failed',
      output_summary: error?.message || 'router failed',
    })

    console.error('router error:', error)
    return {
      code: 500,
      message: error?.message || '智能体路由失败，请稍后再试',
      data: { intent, workflow },
    }
  }
}
