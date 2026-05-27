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
  Am: ['Am', 'G', 'F', 'E'],
}

const SONG_PRESETS = [
  { match: ['成都'], title: '成都', artist: '赵雷', key: 'C', capo: '2品', bpm: 76, strumming: '下 下上 空上 下上', chords: ['C', 'G', 'Am', 'Em', 'F'], progressions: { intro: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'], verseA: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'], verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], chorus: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], bridge: ['Am', 'Em', 'F', 'C', 'F', 'G', 'C', 'C'] } },
  { match: ['晴天'], title: '晴天', artist: '周杰伦', key: 'G', capo: '0品', bpm: 92, strumming: '下 下上 上下上', chords: ['G', 'D', 'Em', 'C', 'Am'], progressions: { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'], verseB: ['Am', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], bridge: ['Em', 'D', 'C', 'G', 'Am', 'D', 'G', 'G'] } },
  { match: ['海阔天空'], title: '海阔天空', artist: 'Beyond', key: 'G', capo: '0品', bpm: 78, strumming: '下 下上 上下上', chords: ['G', 'D', 'Em', 'C', 'Am'], progressions: { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], verseB: ['Am', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], bridge: ['Em', 'D', 'C', 'G', 'Am', 'D', 'G', 'G'] } },
  { match: ['平凡之路'], title: '平凡之路', artist: '朴树', key: 'G', capo: '0品', bpm: 84, strumming: '下 下上 空上 下上', chords: ['G', 'D', 'Em', 'C'], progressions: { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'], verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'], bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'] } },
  { match: ['半壶纱'], title: '半壶纱', artist: '刘珂矣', key: 'Am', capo: '0品', bpm: 72, strumming: '下 下上 上下上', chords: ['Am', 'G', 'F', 'E', 'Dm'], progressions: { intro: ['Am', 'G', 'F', 'E'], verseA: ['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'], verseB: ['F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E'], chorus: ['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'], bridge: ['Dm', 'G', 'C', 'Am', 'F', 'E', 'Am', 'Am'] } },
  { match: ['夜空中最亮的星'], title: '夜空中最亮的星', artist: '逃跑计划', key: 'G', capo: '0品', bpm: 86, strumming: '下 下上 上下上', chords: ['G', 'D', 'Em', 'C'], progressions: { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'], verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'] } },
]

const CHORD_SHAPES = {
  C: ['x', '3', '2', '0', '1', '0'], G: ['3', '2', '0', '0', '0', '3'], D: ['x', 'x', '0', '2', '3', '2'], A: ['x', '0', '2', '2', '2', '0'], E: ['0', '2', '2', '1', '0', '0'], F: ['1', '3', '3', '2', '1', '1'],
  Am: ['x', '0', '2', '2', '1', '0'], Em: ['0', '2', '2', '0', '0', '0'], Dm: ['x', 'x', '0', '2', '3', '1'], Bm: ['x', '2', '4', '4', '3', '2'], 'F#m': ['2', '4', '4', '2', '2', '2'], 'C#m': ['x', '4', '6', '6', '5', '4'],
  Bb: ['x', '1', '3', '3', '3', '1'], Ab: ['4', '6', '6', '5', '4', '4'], Eb: ['x', '6', '8', '8', '8', '6'],
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
function cleanSongTitle(text = '') {
  return String(text || '').replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|六线谱|图片谱|txt谱|TXT谱|完整版|原版|简单版|新手版|教学|指弹|尤克里里/gi, ' ').replace(/[《》【】\[\]（）()]/g, ' ').replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ').trim()
}
function compact(text = '') { return cleanSongTitle(text).replace(/\s+/g, '').toLowerCase() }
function sanitizeReferences(references = []) {
  return (Array.isArray(references) ? references : []).slice(0, 6).map((item) => ({ title: String(item?.title || '').slice(0, 120), url: String(item?.url || '').slice(0, 500), snippet: String(item?.snippet || '').slice(0, 180), provider: String(item?.provider || '').slice(0, 40), result_type: String(item?.result_type || '').slice(0, 40), source_site: String(item?.source_site || '').slice(0, 80) })).filter((item) => item.title || item.url || item.snippet)
}
function sanitizeHints(hints = {}) { return { possibleKeys: Array.isArray(hints.possibleKeys) ? hints.possibleKeys.map(String).slice(0, 4) : [], possibleCapos: Array.isArray(hints.possibleCapos) ? hints.possibleCapos.map(String).slice(0, 4) : [], possibleChords: Array.isArray(hints.possibleChords) ? hints.possibleChords.map(String).slice(0, 12) : [], tabReferenceCount: Number(hints.tabReferenceCount || 0), imageReferenceCount: Number(hints.imageReferenceCount || 0), textReferenceCount: Number(hints.textReferenceCount || 0) } }
function buildWebContext(event = {}) {
  const context = event.web_context || {}
  return { title: cleanSongTitle(event.title || context.title || event.prompt || ''), artist: String(event.artist || context.artist || '').trim(), summary: String(context.summary || '').slice(0, 800), confidence: Number(context.confidence || 0), source: String(context.source || 'ai_direct'), references: sanitizeReferences(context.references), tabReferences: sanitizeReferences(context.tabReferences), arrangementHints: sanitizeHints(context.arrangementHints) }
}
function resolveOutputType(event = {}) { return event.type === 'web_chords' ? 'both' : 'txt' }
function normalizeKey(key = 'C') {
  const raw = String(key || 'C').trim().replace('♭', 'b').replace('＃', '#')
  if (DEFAULT_PROGRESSIONS[raw]) return raw
  if (/^Am/i.test(raw)) return 'Am'
  if (/^G/i.test(raw)) return 'G'
  if (/^D/i.test(raw)) return 'D'
  if (/^A/i.test(raw)) return 'A'
  if (/^E/i.test(raw)) return 'E'
  if (/^F/i.test(raw)) return 'F'
  return 'C'
}
function uniqueChords(chords = []) { return Array.from(new Set((Array.isArray(chords) ? chords : []).map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 12) }
function findPreset(title = '', artist = '') {
  const key = `${compact(title)}${compact(artist)}`
  return SONG_PRESETS.find((preset) => preset.match.some((word) => key.includes(compact(word)))) || null
}
function chooseProgression(event = {}, webContext = {}) {
  const preset = findPreset(webContext.title || event.title || event.prompt || '', webContext.artist || event.artist || '')
  if (preset) return preset
  const hinted = uniqueChords(webContext.arrangementHints?.possibleChords || [])
  const key = normalizeKey(event.song_key || webContext.arrangementHints?.possibleKeys?.[0] || 'C')
  const chords = hinted.length >= 4 ? hinted.slice(0, 6) : (DEFAULT_PROGRESSIONS[key] || DEFAULT_PROGRESSIONS.C)
  return { title: cleanSongTitle(webContext.title || event.title || event.prompt || '目标歌曲'), artist: webContext.artist || event.artist || '', key, capo: String(webContext.arrangementHints?.possibleCapos?.[0] || event.capo || '0品'), bpm: Number(event.bpm || 84), strumming: '下 下上 空上 下上', chords, progressions: { intro: chords.slice(0, 4), verseA: [...chords, ...chords].slice(0, 8), verseB: [...chords.slice().reverse(), ...chords].slice(0, 8), chorus: [...chords, ...chords].slice(0, 8), bridge: [...chords.slice(1), chords[0], ...chords].slice(0, 8) } }
}
function bars(chords = []) { return `| ${chords.join(' | ')} |` }
function splitBars(chords = [], size = 4) { const chunks = []; for (let i = 0; i < chords.length; i += size) chunks.push(chords.slice(i, i + size)); return chunks }
function makeSection(name, chords, instruction) { return { name, lines: splitBars(chords, 4).map((part, index) => ({ chordLine: bars(part), lyricLine: `${instruction}${splitBars(chords, 4).length > 1 ? ` · 第${index + 1}组` : ''}` })) } }
function buildPlayableArrangement(event = {}, webContext = {}, reason = 'local_playable') {
  const preset = chooseProgression(event, webContext)
  const title = cleanSongTitle(preset.title || webContext.title || event.title || event.prompt || '目标歌曲') || '目标歌曲'
  const artist = preset.artist || webContext.artist || event.artist || ''
  const sections = [
    makeSection('前奏', preset.progressions.intro, '分解和弦或轻扫进入，每个和弦1小节'),
    makeSection('主歌A', preset.progressions.verseA, '主歌低力度演唱，右手保持稳定'),
    makeSection('主歌B', preset.progressions.verseB, '主歌第二轮逐渐加一点力度'),
    makeSection('副歌', preset.progressions.chorus, '副歌打开声音，扫弦力度增强'),
    makeSection('桥段/间奏', preset.progressions.bridge, '间奏可用分解和弦，准备回副歌'),
    makeSection('尾奏', preset.progressions.intro.slice(0, 4), '尾奏放慢，最后一个和弦自然延音'),
  ]
  return { title: `${title} AI完整曲谱`, style: '弹唱', song_key: preset.key, bpm: preset.bpm, capo: preset.capo, difficulty: String(event.difficulty || '新手'), strumming: preset.strumming, chords: uniqueChords(preset.chords), sections, practiceTips: [
    artist ? `参考《${title}》${artist}的原曲速度，先用 ${Math.max(60, preset.bpm - 12)} BPM 慢练。` : `参考《${title}》原曲速度，先用 ${Math.max(60, preset.bpm - 12)} BPM 慢练。`,
    `右手节奏：${preset.strumming}。先空弦练 2 分钟，再加左手和弦。`,
    `每个竖线之间是 1 小节；遇到 ${bars(preset.progressions.chorus.slice(0, 4))} 可循环练副歌。`,
    '本谱为 AI 简化练习版，不复刻第三方曲谱，适合快速起弹和后续手动微调。',
  ], generationMode: reason }
}
function normalizeSectionLines(lines = []) { return lines.map((line) => { if (!line) return null; if (typeof line === 'string') return { chordLine: '', lyricLine: line }; return { chordLine: String(line.chordLine || line.chord || '').trim(), lyricLine: String(line.lyricLine || line.lyric || line.text || '').trim() } }).filter((line) => line && (line.lyricLine || line.chordLine)) }
function isPlayablePayload(payload = {}) { return Array.isArray(payload.sections) && payload.sections.length >= 4 && payload.sections.reduce((sum, section) => sum + normalizeSectionLines(section.lines || []).length, 0) >= 8 && uniqueChords(payload.chords).length >= 4 }
function normalizeSongPayload(payload = {}, fallback = {}) {
  const fallbackTab = fallback.fallbackTab || buildPlayableArrangement({}, {}, 'payload_fallback')
  const source = isPlayablePayload(payload) ? payload : fallbackTab
  const sections = source.sections.map((section) => ({ name: String(section?.name || '正文'), lines: normalizeSectionLines(section?.lines || []) })).filter((section) => section.lines.length)
  return { title: String(source.title || fallbackTab.title || 'AI完整曲谱'), style: String(source.style || fallbackTab.style || '弹唱'), song_key: String(source.song_key || source.key || fallbackTab.song_key || 'C'), bpm: Number(source.bpm || fallbackTab.bpm || 84), capo: String(source.capo || fallbackTab.capo || '0品'), difficulty: String(source.difficulty || fallbackTab.difficulty || '新手'), strumming: String(source.strumming || fallbackTab.strumming || '下 下上 空上 下上'), chords: uniqueChords(source.chords).length ? uniqueChords(source.chords) : uniqueChords(fallbackTab.chords), sections, practiceTips: Array.isArray(source.practiceTips) && source.practiceTips.length ? source.practiceTips.map(String).slice(0, 5) : fallbackTab.practiceTips, generationMode: source.generationMode || 'ai_repaired' }
}
function sectionsToRawText(sections = []) { return sections.map((section) => `[${section.name}]\n${section.lines.map((line) => line.chordLine ? `${line.chordLine}\n${line.lyricLine}` : line.lyricLine).join('\n')}`).join('\n\n') }
function chordRoot(chord = '') { return String(chord || '').replace(/\/.*$/, '').trim() }
function shapeFor(chord = '') { return CHORD_SHAPES[chordRoot(chord)] || ['x', 'x', 'x', 'x', 'x', 'x'] }
function padCell(text = '', width = 8) { const raw = String(text || '').slice(0, width); return raw + ' '.repeat(Math.max(0, width - raw.length)) }
function parseChordBar(line = '') { return String(line || '').split('|').map((item) => item.trim()).filter(Boolean).flatMap((cell) => cell.split(/\s+/).filter(Boolean)).slice(0, 4) }
function buildSixLineBlock(chordLine = '', lyricLine = '') {
  const chords = parseChordBar(chordLine).length ? parseChordBar(chordLine) : ['C', 'G', 'Am', 'F']
  const stringNames = ['E', 'A', 'D', 'G', 'B', 'e']
  const header = `     ${chords.map((chord) => padCell(chord, 8)).join('')}`
  const lines = stringNames.map((name, stringIndex) => `${name}|${chords.map((chord) => `--${shapeFor(chord)[stringIndex]}---${shapeFor(chord)[stringIndex]}-`).join('')}|`)
  return [header, ...lines.reverse(), `节奏 ${chords.map(() => '↓ ↓↑ ↑↓↑').join(' | ')}`, `提示 ${String(lyricLine || '').slice(0, 36)}`]
}
function buildImageTabPages(sections = [], meta = {}) {
  const pages = []
  let blocks = [{ type: 'section', text: `${meta.title || 'AI完整曲谱'}｜${meta.song_key || 'C'}调｜${meta.capo || '0品'}｜${meta.bpm || 84} BPM` }, { type: 'tab', lines: [`右手节奏：${meta.strumming || '下 下上 空上 下上'}`, `常用和弦：${(meta.chords || []).join('  ')}`] }]
  sections.forEach((section) => {
    blocks.push({ type: 'section', text: section.name })
    section.lines.forEach((line) => {
      blocks.push({ type: 'tab', lines: buildSixLineBlock(line.chordLine, line.lyricLine) })
      if (blocks.length >= 6) { pages.push({ title: `${meta.title || '图片六线谱'} · 第${pages.length + 1}页`, blocks }); blocks = [] }
    })
  })
  if (blocks.length) pages.push({ title: `${meta.title || '图片六线谱'} · 第${pages.length + 1}页`, blocks })
  return pages
}
function buildSongPrompt(event) {
  const webContext = buildWebContext(event)
  const title = cleanSongTitle(webContext.title || event.title || event.prompt || '')
  const artist = webContext.artist || event.artist || ''
  const refLines = [...webContext.tabReferences, ...webContext.references].slice(0, 6).map((item, index) => `${index + 1}. ${item.title} ${item.snippet}`.trim()).join('\n')
  return `只输出JSON，不能有markdown。请为吉他初学者生成一份可以实际练习的简化弹唱谱。\n歌名：${title}\n歌手：${artist}\n参考线索：${refLines || '无'}\n要求：1. 不复制完整歌词，不声称官方或原版；2. 必须包含 title, style, song_key, bpm, capo, difficulty, strumming, chords, sections, practiceTips；3. sections 至少包含 前奏、主歌A、主歌B、副歌、桥段/间奏、尾奏；4. 每个 section 至少2行，lines 每行必须有 chordLine 和 lyricLine；5. chordLine 必须用小节线格式，例如 | C | G | Am | F |；6. lyricLine 只写演唱位置/练习提示，不写原歌词；7. 和弦总数至少4个，整首谱要能直接照着练。`
}
function resolveEnvId(wxContext) { return process.env.TCB_ENV || process.env.CLOUDBASE_ENV_ID || process.env.SCF_NAMESPACE || wxContext?.ENV || undefined }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
function getErrorCode(error) { return String(error?.code || error?.statusCode || '') }
function withTimeout(promise, ms) { return Promise.race([promise, new Promise((_r, reject) => setTimeout(() => reject(new Error('AI模型响应超时，已使用本地可练习谱兜底')), ms))]) }
async function callCloudbaseModel(event, wxContext) {
  const envId = resolveEnvId(wxContext)
  const app = envId ? tcb.init({ env: envId }) : tcb.init()
  const providerCandidates = Array.from(new Set([event.provider || 'hunyuan-v3', 'hunyuan-v3', 'hunyuan-open', 'hunyuan-exp', 'hunyuan', 'cloudbase']))
  let lastError
  for (const provider of providerCandidates) {
    const model = app.ai().createModel(provider)
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try { return normalizeText(await withTimeout(model.generateText({ model: event.model || 'hy3-preview', messages: [{ role: 'user', content: buildSongPrompt(event) }], temperature: 0.35 }), 11000)) } catch (error) {
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
  const fallbackTab = buildPlayableArrangement(event, webContext, 'local_playable')
  let parsed = fallbackTab
  let modelStatus = 'local_playable'
  let modelErrorMessage = ''
  try {
    const rawModelText = await callCloudbaseModel(event, wxContext)
    const modelPayload = JSON.parse(extractJsonString(rawModelText))
    parsed = isPlayablePayload(modelPayload) ? modelPayload : fallbackTab
    modelStatus = isPlayablePayload(modelPayload) ? 'model_success' : 'model_repaired_by_playable_template'
  } catch (error) {
    modelStatus = 'local_playable'
    modelErrorMessage = error?.message || '模型输出不可用，已使用本地可练习谱生成'
    parsed = fallbackTab
  }
  const normalized = normalizeSongPayload(parsed, { fallbackTab })
  const rawText = sectionsToRawText(normalized.sections)
  const imageTabPages = buildImageTabPages(normalized.sections, normalized)
  const isPublic = Boolean(event.is_public) && !isWebChords
  const sourceType = isWebChords ? 'ai_web_dual_tab' : 'ai_dual_tab'
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
    tags: ['AI生成完整曲谱', '可练习', 'TXT谱', '图片六线谱', normalized.style],
    raw_text: rawText,
    content_json: { sections: normalized.sections, chords: normalized.chords, practiceTips: normalized.practiceTips, strumming: normalized.strumming, copyrightNotice: 'AI 生成的简化练习曲谱，非官方曲谱。', arrangementHints: isWebChords ? webContext.arrangementHints : null, modelStatus, modelErrorMessage, tabOutputType: 'both', imageTabPages },
    generation_source: isWebChords ? { type: 'ai_dual_tab_direct', provider: webContext.source || 'ai_direct', confidence: webContext.confidence || 0, summary: webContext.summary || '', references: webContext.references, tabReferences: webContext.tabReferences, arrangementHints: webContext.arrangementHints, modelStatus, tabOutputType: 'both' } : { type: sourceType, modelStatus, tabOutputType: 'both' },
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
  return { code: 0, data: { songId: songResult._id, title: data.title, style: data.style, song_key: data.song_key, bpm: data.bpm, capo: data.capo, difficulty: data.difficulty, strumming: data.strumming, chords: normalized.chords, sections: normalized.sections, practiceTips: normalized.practiceTips, source_type: data.source_type, tabOutputType: 'both', imageTabPages, modelStatus, modelErrorMessage, user: { id: user._id, generation_quota: nextGenerationQuota, total_generated: nextTotalGenerated, works_count: nextWorksCount, membership_type: user.membership_type || 'free' } } }
}
