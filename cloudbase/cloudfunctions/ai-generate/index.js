const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const users = db.collection('users')
const songs = db.collection('songs')

const bannedWords = ['赌博', '诈骗', '违禁', '暴力', '恐怖主义']
const DEFAULT_PROGRESSIONS = {
  C: ['C', 'G', 'Am', 'F'],
  G: ['G', 'D', 'Em', 'C'],
  D: ['D', 'A', 'Bm', 'G'],
  A: ['A', 'E', 'F#m', 'D'],
  E: ['E', 'B', 'C#m', 'A'],
  F: ['F', 'C', 'Dm', 'Bb'],
}

function reviewContent(text = '') { return !bannedWords.some((word) => String(text || '').includes(word)) }
function normalizeText(input) {
  if (!input) return ''
  if (typeof input === 'string') return input
  if (Array.isArray(input)) return input.map((item) => normalizeText(item)).join('')
  if (typeof input === 'object') {
    const direct = input.text || input.content || input.output || input.answer
    if (typeof direct === 'string') return direct
    const parts = [input?.data?.content, input?.choices?.[0]?.message?.content, input?.choices?.[0]?.delta?.content, input?.result, input?.response, input?.message]
    const first = parts.find((item) => typeof item === 'string')
    if (first) return first
    try { return JSON.stringify(input) } catch (_error) { return '' }
  }
  return String(input)
}
function extractJsonString(rawText = '') {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()
  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) return rawText.slice(firstBrace, lastBrace + 1)
  return rawText.trim()
}
function sanitizeReferences(references = []) {
  return (Array.isArray(references) ? references : []).slice(0, 8).map((item) => ({
    title: String(item?.title || '').slice(0, 120),
    url: String(item?.url || '').slice(0, 500),
    snippet: String(item?.snippet || '').slice(0, 180),
    category: String(item?.category || '').slice(0, 40),
    provider: String(item?.provider || '').slice(0, 40),
    tab_score: Number(item?.tab_score || 0),
    result_type: String(item?.result_type || '').slice(0, 40),
    source_site: String(item?.source_site || '').slice(0, 80),
  })).filter((item) => item.title || item.url || item.snippet)
}
function sanitizeHints(hints = {}) {
  return {
    possibleKeys: Array.isArray(hints.possibleKeys) ? hints.possibleKeys.map(String).slice(0, 4) : [],
    possibleCapos: Array.isArray(hints.possibleCapos) ? hints.possibleCapos.map(String).slice(0, 4) : [],
    possibleChords: Array.isArray(hints.possibleChords) ? hints.possibleChords.map(String).slice(0, 12) : [],
    tabReferenceCount: Number(hints.tabReferenceCount || 0),
    imageReferenceCount: Number(hints.imageReferenceCount || 0),
    textReferenceCount: Number(hints.textReferenceCount || 0),
  }
}
function buildWebContext(event = {}) {
  const context = event.web_context || {}
  return {
    title: String(event.title || context.title || '').trim(),
    artist: String(event.artist || context.artist || '').trim(),
    summary: String(context.summary || '').slice(0, 800),
    confidence: Number(context.confidence || 0),
    source: String(context.source || 'web'),
    references: sanitizeReferences(context.references),
    tabReferences: sanitizeReferences(context.tabReferences),
    arrangementHints: sanitizeHints(context.arrangementHints),
  }
}
function resolveOutputType(event = {}) {
  if (event.type === 'web_chords') return 'both'
  const type = String(event.tab_output_type || event.output_type || event.web_context?.preferred_output_type || '').toLowerCase()
  if (type === 'image') return 'image'
  if (type === 'both') return 'both'
  return 'txt'
}
function normalizeKey(key = 'C') {
  const raw = String(key || 'C').trim().replace('♭', 'b').replace('＃', '#')
  if (DEFAULT_PROGRESSIONS[raw]) return raw
  if (/^G/i.test(raw)) return 'G'
  if (/^D/i.test(raw)) return 'D'
  if (/^A/i.test(raw)) return 'A'
  if (/^E/i.test(raw)) return 'E'
  if (/^F/i.test(raw)) return 'F'
  return 'C'
}
function uniqueChords(chords = []) { return Array.from(new Set((Array.isArray(chords) ? chords : []).map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 10) }
function chooseChords(event = {}, webContext = {}) {
  const hinted = uniqueChords(webContext.arrangementHints?.possibleChords || [])
  if (hinted.length >= 4) return hinted.slice(0, 8)
  const key = normalizeKey(event.song_key || webContext.arrangementHints?.possibleKeys?.[0] || 'C')
  return DEFAULT_PROGRESSIONS[key] || DEFAULT_PROGRESSIONS.C
}
function outputName(type = 'txt') {
  if (type === 'image') return '图片六线谱'
  if (type === 'both') return '完整双谱'
  return 'TXT弹唱谱'
}
function buildFallbackTab(event = {}, webContext = {}, reason = 'fallback') {
  const title = String(webContext.title || event.title || event.prompt || '目标歌曲').trim() || '目标歌曲'
  const artist = String(webContext.artist || event.artist || '').trim()
  const key = normalizeKey(event.song_key || webContext.arrangementHints?.possibleKeys?.[0] || 'C')
  const chords = chooseChords(event, webContext)
  const main = chords.slice(0, 4).join(' ')
  const verse = chords.slice().reverse().slice(0, 4).join(' ')
  const bridge = chords.length >= 6 ? chords.slice(2, 6).join(' ') : `${chords[1] || 'G'} ${chords[2] || 'Am'} ${chords[3] || 'F'} ${chords[0] || 'C'}`
  const type = resolveOutputType(event)
  return {
    title: `${title} AI${outputName(type)}`,
    style: '弹唱',
    song_key: key,
    bpm: Number(event.bpm || 86),
    capo: String(webContext.arrangementHints?.possibleCapos?.[0] || event.capo || '0品'),
    difficulty: String(event.difficulty || '新手'),
    strumming: '下 下上 上下上',
    chords,
    sections: [
      { name: '前奏', lines: [{ chordLine: main, lyricLine: '前奏 4 小节，按节奏型循环 1 遍' }] },
      { name: '主歌', lines: [
        { chordLine: main, lyricLine: '主歌第 1 句，轻扫进入，注意换和弦干净' },
        { chordLine: verse, lyricLine: '主歌第 2 句，保持稳定右手节奏' },
      ] },
      { name: '副歌', lines: [
        { chordLine: main, lyricLine: '副歌第 1 句，力度稍微增强' },
        { chordLine: bridge, lyricLine: '副歌第 2 句，尾音留半拍再换和弦' },
      ] },
      { name: '间奏', lines: [{ chordLine: main, lyricLine: '间奏 4 小节，可用分解和弦或轻扫' }] },
      { name: '尾奏', lines: [{ chordLine: `${chords[3] || 'F'} ${chords[0] || 'C'}`, lyricLine: '尾奏放慢收束，最后一个和弦自然延音' }] },
    ],
    practiceTips: [
      artist ? `先按《${title}》${artist} 的听感找速度，再用本谱做简化练习。` : `先按《${title}》的听感找速度，再用本谱做简化练习。`,
      '先只练左手换和弦，每个和弦 4 拍。',
      '右手节奏稳定后，再尝试加入弱拍轻扫。',
      reason === 'model_error' ? '当前为模型异常后的本地兜底谱，可作为练习草稿继续手动调整。' : '已同时生成 TXT 谱和图片六线谱，适合先看谱再练习。',
    ],
    generationMode: reason,
  }
}
function normalizeSectionLines(lines = []) {
  return lines.map((line) => {
    if (!line) return null
    if (typeof line === 'string') return { chordLine: '', lyricLine: line }
    return { chordLine: String(line.chordLine || line.chord || ''), lyricLine: String(line.lyricLine || line.lyric || line.text || '').trim() }
  }).filter((line) => line && line.lyricLine)
}
function normalizeSongPayload(payload = {}, fallback = {}) {
  const fallbackTab = fallback.fallbackTab || buildFallbackTab({}, {}, 'payload_fallback')
  const sections = Array.isArray(payload.sections) ? payload.sections.map((section) => ({ name: String(section?.name || '正文'), lines: normalizeSectionLines(section?.lines || []) })).filter((section) => section.lines.length) : []
  const chords = uniqueChords(payload.chords).length ? uniqueChords(payload.chords) : uniqueChords(fallbackTab.chords)
  const practiceTips = Array.isArray(payload.practiceTips) && payload.practiceTips.length ? payload.practiceTips.map(String).slice(0, 4) : fallbackTab.practiceTips
  return {
    title: String(payload.title || fallback.title || fallbackTab.title || 'AI曲谱'),
    style: String(payload.style || fallback.style || fallbackTab.style || '弹唱'),
    song_key: String(payload.song_key || payload.key || fallback.song_key || fallbackTab.song_key || 'C'),
    bpm: Number(payload.bpm || fallback.bpm || fallbackTab.bpm || 86),
    capo: String(payload.capo || fallback.capo || fallbackTab.capo || '0品'),
    difficulty: String(payload.difficulty || fallback.difficulty || fallbackTab.difficulty || '新手'),
    strumming: String(payload.strumming || fallback.strumming || fallbackTab.strumming || '下 下上 上下上'),
    chords,
    sections: sections.length ? sections : fallbackTab.sections,
    practiceTips,
    generationMode: payload.generationMode || fallbackTab.generationMode || 'ai',
  }
}
function sectionsToRawText(sections = []) { return sections.map((section) => `[${section.name}]\n${section.lines.map((line) => line.chordLine ? `${line.chordLine}\n${line.lyricLine}` : line.lyricLine).join('\n')}`).join('\n\n') }
function buildSixLineBlock(chordLine = '', lyricLine = '') {
  const chords = String(chordLine || '').trim() || 'C G Am F'
  return ['e|----------------|----------------|', 'B|------1---------|------0---------|', 'G|----0---0-------|----0---0-------|', 'D|--2-------------|--0-------------|', 'A|3---------------|2---------------|', 'E|----------------|3---------------|', `   ${chords}`, `   ${String(lyricLine || '').slice(0, 32)}`]
}
function buildImageTabPages(sections = [], meta = {}) {
  const pages = []
  let blocks = []
  sections.forEach((section) => {
    blocks.push({ type: 'section', text: section.name })
    section.lines.forEach((line) => {
      blocks.push({ type: 'tab', lines: buildSixLineBlock(line.chordLine, line.lyricLine) })
      if (blocks.length >= 7) { pages.push({ title: `${meta.title || '图片六线谱'} · 第${pages.length + 1}页`, blocks }); blocks = [] }
    })
  })
  if (blocks.length) pages.push({ title: `${meta.title || '图片六线谱'} · 第${pages.length + 1}页`, blocks })
  return pages.length ? pages : [{ title: `${meta.title || '图片六线谱'} · 第1页`, blocks: [{ type: 'tab', lines: buildSixLineBlock('C G Am F', 'AI 生成图片六线谱') }] }]
}
function buildSongPrompt(event) {
  const webContext = buildWebContext(event)
  const isWebChords = event.type === 'web_chords'
  const outputType = resolveOutputType(event)
  const refLines = [...webContext.tabReferences, ...webContext.references].slice(0, 10).map((item, index) => `${index + 1}. ${item.title} ${item.snippet}`.trim()).join('\n')
  const hints = webContext.arrangementHints || {}
  const hintLines = [hints.possibleKeys?.length ? `疑似调式：${hints.possibleKeys.join('、')}` : '', hints.possibleCapos?.length ? `疑似变调夹：${hints.possibleCapos.join('、')}` : '', hints.possibleChords?.length ? `线索中出现的和弦：${hints.possibleChords.join('、')}` : '', hints.tabReferenceCount ? `曲谱线索数量：${hints.tabReferenceCount}` : ''].filter(Boolean).join('\n')
  const rules = `只输出 JSON。字段必须包含 title, style, song_key, bpm, capo, difficulty, strumming, chords, sections, practiceTips。sections 每个元素包含 name 和 lines，lines 每行包含 chordLine 与 lyricLine。不要复制完整歌词，不要复刻第三方曲谱，不要声称官方或原版。请生成可练习的 AI 简化曲谱，lyricLine 使用段落提示、演唱位置提示或短占位提示。输出类型：${outputType === 'both' ? '同时生成TXT谱和图片六线谱所需结构' : outputName(outputType)}。`
  if (isWebChords) return `${rules}\n歌名：${webContext.title || event.title || ''}\n歌手：${webContext.artist || event.artist || ''}\n难度：${event.difficulty || '新手'}\n目标调式：${event.song_key || 'C'}\n搜索摘要：${webContext.summary || ''}\n编配线索：\n${hintLines || '无'}\n参考资源：\n${refLines || '无'}\n请生成一份新手能练的完整双谱。`
  return `${rules}\n模式：${event.type || 'songwriting'}\n风格：${event.style || '民谣'}\n难度：${event.difficulty || '新手'}\n调式：${event.song_key || 'C'}\n用户输入：${event.prompt || event.lyrics || ''}`
}
function resolveEnvId(wxContext) { return process.env.TCB_ENV || process.env.CLOUDBASE_ENV_ID || process.env.SCF_NAMESPACE || wxContext?.ENV || undefined }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
function getErrorCode(error) { return String(error?.code || error?.statusCode || '') }
function withTimeout(promise, ms) { return Promise.race([promise, new Promise((_r, reject) => setTimeout(() => reject(new Error('AI模型响应超时，已使用本地谱面兜底')), ms))]) }
async function callCloudbaseModel(event, wxContext) {
  const envId = resolveEnvId(wxContext)
  const app = envId ? tcb.init({ env: envId }) : tcb.init()
  const providerCandidates = Array.from(new Set([event.provider || 'hunyuan-v3', 'hunyuan-v3', 'hunyuan-open', 'hunyuan-exp', 'hunyuan', 'cloudbase']))
  let lastError
  for (const provider of providerCandidates) {
    const model = app.ai().createModel(provider)
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try { return normalizeText(await withTimeout(model.generateText({ model: event.model || 'hy3-preview', messages: [{ role: 'user', content: buildSongPrompt(event) }], temperature: 0.55 }), 9000)) } catch (error) {
        lastError = error
        if (getErrorCode(error) === '429' && attempt < 2) { await sleep(450 * attempt); continue }
        if (getErrorCode(error) === '429') break
      }
    }
  }
  throw lastError || new Error('AI 模型调用失败')
}
async function getCurrentUser(openid) { const result = await users.where({ openid }).limit(1).get(); return result.data[0] || null }
async function ensureUser(openid, now) {
  let user = await getCurrentUser(openid)
  if (user) return user
  const seed = { openid, nickname: '谱灵用户', avatar_url: '', membership_type: 'free', generation_quota: 10, daily_free_quota: 5, total_generated: 0, works_count: 0, followers_count: 0, following_count: 0, likes_count: 0, status: 'active', created_at: now, updated_at: now, last_login_at: now }
  const created = await users.add({ data: seed })
  return { _id: created._id, ...seed }
}
exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || 'debug-openid'
  const now = new Date()
  const webContext = buildWebContext(event)
  const isWebChords = event.type === 'web_chords'
  const tabOutputType = resolveOutputType(event)
  const sourceText = String(event.prompt || event.lyrics || event.title || webContext.title || webContext.summary || '')
  if (!reviewContent(sourceText)) return { code: 403, message: '内容审核未通过，请调整后重试' }
  const user = await ensureUser(openid, now)
  if ((user.generation_quota || 0) <= 0 && user.membership_type === 'free') return { code: 403, message: '今日免费额度已用完，请明日再试' }
  const fallbackTab = buildFallbackTab(event, webContext, 'local_fallback')
  let parsed = fallbackTab
  let modelStatus = 'fallback_not_called'
  let modelErrorMessage = ''
  try {
    const rawModelText = await callCloudbaseModel(event, wxContext)
    parsed = JSON.parse(extractJsonString(rawModelText))
    modelStatus = 'model_success'
  } catch (error) {
    modelStatus = 'local_fallback'
    modelErrorMessage = error?.message || '模型输出不可用，已使用本地规则生成'
    parsed = buildFallbackTab(event, webContext, error?.message ? 'model_error' : 'parse_error')
  }
  const normalized = normalizeSongPayload(parsed, { title: fallbackTab.title, style: fallbackTab.style, song_key: fallbackTab.song_key, capo: fallbackTab.capo, difficulty: fallbackTab.difficulty, strumming: fallbackTab.strumming, fallbackTab })
  const rawText = sectionsToRawText(normalized.sections)
  const imageTabPages = (tabOutputType === 'image' || tabOutputType === 'both') ? buildImageTabPages(normalized.sections, normalized) : []
  const isPublic = Boolean(event.is_public) && !isWebChords
  const sourceType = isWebChords ? (tabOutputType === 'both' ? 'ai_web_dual_tab' : tabOutputType === 'image' ? 'ai_web_image_tab' : 'ai_web_txt') : (tabOutputType === 'both' ? 'ai_dual_tab' : tabOutputType === 'image' ? 'ai_image_tab' : 'ai_txt')
  const data = {
    user_openid: openid,
    user_id: user._id,
    title: normalized.title,
    artist_name: isWebChords ? (webContext.artist || event.artist || 'AI生成') : 'AI生成',
    original_song_title: isWebChords ? (webContext.title || event.title || '') : '',
    original_artist_name: isWebChords ? (webContext.artist || event.artist || '') : '',
    style: normalized.style,
    song_key: normalized.song_key,
    bpm: normalized.bpm,
    capo: normalized.capo,
    difficulty: normalized.difficulty,
    strumming: normalized.strumming,
    tags: isWebChords ? ['AI生成完整曲谱', 'TXT谱', '图片六线谱', '网络搜索', normalized.style] : ['AI生成完整曲谱', 'TXT谱', '图片六线谱', normalized.style],
    raw_text: rawText,
    content_json: { sections: normalized.sections, chords: normalized.chords, practiceTips: normalized.practiceTips, copyrightNotice: isWebChords ? 'AI 生成的简化曲谱，非官方曲谱。' : '', arrangementHints: isWebChords ? webContext.arrangementHints : null, modelStatus, modelErrorMessage, tabOutputType, imageTabPages },
    generation_source: isWebChords ? { type: 'ai_dual_tab_from_search', provider: webContext.source || 'web', confidence: webContext.confidence || 0, summary: webContext.summary || '', references: webContext.references, tabReferences: webContext.tabReferences, arrangementHints: webContext.arrangementHints, modelStatus, tabOutputType } : { type: sourceType, modelStatus, tabOutputType },
    source_type: sourceType,
    edit_mode: 'ai',
    has_tab: true,
    is_public: isPublic,
    visibility: isPublic ? 'public' : 'private',
    audit_status: isPublic ? 'pending' : 'private',
    favorite_count: 0,
    like_count: 0,
    comment_count: 0,
    view_count: 0,
    practice_count: 0,
    created_at: now,
    updated_at: now,
  }
  const songResult = await songs.add({ data })
  const nextGenerationQuota = Math.max(0, Number(user.generation_quota || 0) - 1)
  const nextTotalGenerated = Number(user.total_generated || 0) + 1
  const nextWorksCount = Number(user.works_count || 0) + 1
  await users.doc(user._id).update({ data: { generation_quota: _.inc(-1), total_generated: _.inc(1), works_count: _.inc(1), updated_at: now } })
  return { code: 0, data: { songId: songResult._id, title: data.title, style: data.style, song_key: data.song_key, bpm: data.bpm, capo: data.capo, difficulty: data.difficulty, strumming: data.strumming, chords: normalized.chords, sections: normalized.sections, practiceTips: normalized.practiceTips, source_type: data.source_type, tabOutputType, imageTabPages, modelStatus, modelErrorMessage, user: { id: user._id, generation_quota: nextGenerationQuota, total_generated: nextTotalGenerated, works_count: nextWorksCount, membership_type: user.membership_type || 'free' } } }
}
