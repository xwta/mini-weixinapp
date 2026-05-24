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

function buildContext(event = {}, wxContext = {}) {
  const input = normalizeText(event.input || event.prompt || event.keyword || event.lyrics || '')
  const openid = wxContext.OPENID || event.openid || 'debug-openid'
  const intent = detectIntent(input, event.intent)
  const workflow = buildWorkflow(intent)

  return {
    event: { ...event, input },
    input,
    openid,
    intent,
    workflow,
    startedAt: Date.now(),
  }
}

function summarizeResult(result = {}) {
  return result?.data?.title || result?.data?.message || result?.message || result?.result?.title || ''
}

module.exports = {
  INTENTS,
  normalizeText,
  detectIntent,
  buildWorkflow,
  buildContext,
  summarizeResult,
}
