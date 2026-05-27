const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const users = db.collection('users')
const songs = db.collection('songs')
const songProfiles = db.collection('song_profiles')

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

const PROFILE_SECTIONS = ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']
const SECTION_NAMES = {
  intro: '前奏',
  verseA: '主歌A',
  verseB: '主歌B',
  chorus: '副歌',
  bridge: '桥段/间奏',
  outro: '尾奏',
}
const SECTION_TIPS = {
  intro: '按原曲感觉进入，每个和弦1小节，可先分解后轻扫',
  verseA: '主歌低力度演唱，右手保持稳定，不要抢拍',
  verseB: '主歌第二轮逐渐加一点力度，注意换和弦提前准备',
  chorus: '副歌打开声音，扫弦力度增强，保持小节稳定',
  bridge: '间奏可用分解和弦，作为回副歌的过渡',
  outro: '尾奏放慢，最后一个和弦自然延音',
}

const SONG_PROFILES = [
  profile('成都', '赵雷', ['成都', '赵雷成都'], 'C', '2品', 76, '下 下上 空上 下上', ['C', 'G', 'Am', 'Em', 'F'], {
    intro: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'],
    verseA: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'],
    verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    chorus: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    bridge: ['Am', 'Em', 'F', 'C', 'F', 'G', 'C', 'C'],
    outro: ['F', 'G', 'C', 'C'],
  }),
  profile('晴天', '周杰伦', ['晴天', '周杰伦晴天'], 'G', '0品', 92, '下 下上 上下上', ['G', 'D', 'Em', 'C', 'Am'], {
    intro: ['G', 'D', 'Em', 'C'],
    verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'],
    verseB: ['Am', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'],
    chorus: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'],
    bridge: ['Em', 'D', 'C', 'G', 'Am', 'D', 'G', 'G'],
    outro: ['C', 'D', 'G', 'G'],
  }),
  profile('海阔天空', 'Beyond', ['海阔天空', 'beyond海阔天空'], 'G', '0品', 78, '下 下上 上下上', ['G', 'D', 'Em', 'C', 'Am'], {
    intro: ['G', 'D', 'Em', 'C'],
    verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
    verseB: ['Am', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'],
    chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
    bridge: ['Em', 'D', 'C', 'G', 'Am', 'D', 'G', 'G'],
    outro: ['C', 'D', 'G', 'G'],
  }),
  profile('平凡之路', '朴树', ['平凡之路', '朴树平凡之路'], 'G', '0品', 84, '下 下上 空上 下上', ['G', 'D', 'Em', 'C'], {
    intro: ['G', 'D', 'Em', 'C'],
    verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'],
    verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'],
    chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'],
    bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'],
    outro: ['C', 'D', 'G', 'G'],
  }),
  profile('半壶纱', '刘珂矣', ['半壶纱', '刘珂矣半壶纱'], 'Am', '0品', 72, '下 下上 上下上', ['Am', 'G', 'F', 'E', 'Dm'], {
    intro: ['Am', 'G', 'F', 'E'],
    verseA: ['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'],
    verseB: ['F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E'],
    chorus: ['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'],
    bridge: ['Dm', 'G', 'C', 'Am', 'F', 'E', 'Am', 'Am'],
    outro: ['F', 'E', 'Am', 'Am'],
  }),
  profile('夜空中最亮的星', '逃跑计划', ['夜空中最亮的星', '逃跑计划夜空中最亮的星'], 'G', '0品', 86, '下 下上 上下上', ['G', 'D', 'Em', 'C'], {
    intro: ['G', 'D', 'Em', 'C'],
    verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'],
    verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'],
    chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
    bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'],
    outro: ['C', 'D', 'G', 'G'],
  }),
  profile('蓝莲花', '许巍', ['蓝莲花', '许巍蓝莲花'], 'G', '0品', 82, '下 下上 空上 下上', ['G', 'D', 'Em', 'C'], {
    intro: ['G', 'D', 'Em', 'C'],
    verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'],
    verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'],
    chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
    bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'],
    outro: ['C', 'D', 'G', 'G'],
  }),
  profile('曾经的你', '许巍', ['曾经的你', '许巍曾经的你'], 'G', '0品', 92, '下 下上 上下上', ['G', 'D', 'Em', 'C'], {
    intro: ['G', 'D', 'Em', 'C'],
    verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
    verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'],
    chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
    bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'],
    outro: ['C', 'D', 'G', 'G'],
  }),
  profile('董小姐', '宋冬野', ['董小姐', '宋冬野董小姐'], 'C', '0品', 78, '下 下上 空上 下上', ['C', 'G', 'Am', 'F'], {
    intro: ['C', 'G', 'Am', 'F'],
    verseA: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'F'],
    verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    chorus: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    bridge: ['Am', 'G', 'F', 'C', 'F', 'G', 'C', 'C'],
    outro: ['F', 'G', 'C', 'C'],
  }),
  profile('安和桥', '宋冬野', ['安和桥', '宋冬野安和桥'], 'C', '3品', 70, '下 下上 空上 下上', ['C', 'G', 'Am', 'F'], {
    intro: ['C', 'G', 'Am', 'F'],
    verseA: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'F'],
    verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    chorus: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    bridge: ['Am', 'G', 'F', 'C', 'F', 'G', 'C', 'C'],
    outro: ['F', 'G', 'C', 'C'],
  }),
  profile('稻香', '周杰伦', ['稻香', '周杰伦稻香'], 'C', '0品', 86, '下 下上 上下上', ['C', 'G', 'Am', 'F'], {
    intro: ['C', 'G', 'Am', 'F'],
    verseA: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'F'],
    verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    chorus: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    bridge: ['Am', 'G', 'F', 'C', 'F', 'G', 'C', 'C'],
    outro: ['F', 'G', 'C', 'C'],
  }),
  profile('演员', '薛之谦', ['演员', '薛之谦演员'], 'C', '0品', 78, '下 下上 空上 下上', ['C', 'G', 'Am', 'F', 'Em'], {
    intro: ['C', 'G', 'Am', 'F'],
    verseA: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'],
    verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    chorus: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'],
    bridge: ['Am', 'Em', 'F', 'C', 'F', 'G', 'C', 'C'],
    outro: ['F', 'G', 'C', 'C'],
  }),
]

const CHORD_SHAPES = {
  C: ['x', '3', '2', '0', '1', '0'], G: ['3', '2', '0', '0', '0', '3'], D: ['x', 'x', '0', '2', '3', '2'], A: ['x', '0', '2', '2', '2', '0'], E: ['0', '2', '2', '1', '0', '0'], F: ['1', '3', '3', '2', '1', '1'],
  Am: ['x', '0', '2', '2', '1', '0'], Em: ['0', '2', '2', '0', '0', '0'], Dm: ['x', 'x', '0', '2', '3', '1'], Bm: ['x', '2', '4', '4', '3', '2'], 'F#m': ['2', '4', '4', '2', '2', '2'], 'C#m': ['x', '4', '6', '6', '5', '4'],
  Bb: ['x', '1', '3', '3', '3', '1'], Ab: ['4', '6', '6', '5', '4', '4'], Eb: ['x', '6', '8', '8', '8', '6'],
}

function profile(title, artist, aliases, key, capo, bpm, strumming, chords, progressions) {
  return { title, artist, aliases, key, capo, bpm, strumming, chords, progressions, source: 'built_in_song_profile', matchLevel: 'known_song_profile' }
}
function reviewContent(text = '') { return !bannedWords.some((word) => String(text || '').includes(word)) }
function cleanSongTitle(text = '') { return String(text || '').replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|六线谱|图片谱|txt谱|TXT谱|完整版|原版|简单版|新手版|教学|指弹|尤克里里/gi, ' ').replace(/[《》【】\[\]（）()]/g, ' ').replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ').trim() }
function compact(text = '') { return cleanSongTitle(text).replace(/\s+/g, '').toLowerCase() }
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
function sanitizeReferences(references = []) { return (Array.isArray(references) ? references : []).slice(0, 6).map((item) => ({ title: String(item?.title || '').slice(0, 120), url: String(item?.url || '').slice(0, 500), snippet: String(item?.snippet || '').slice(0, 180), provider: String(item?.provider || '').slice(0, 40), result_type: String(item?.result_type || '').slice(0, 40), source_site: String(item?.source_site || '').slice(0, 80) })).filter((item) => item.title || item.url || item.snippet) }
function sanitizeHints(hints = {}) { return { possibleKeys: Array.isArray(hints.possibleKeys) ? hints.possibleKeys.map(String).slice(0, 4) : [], possibleCapos: Array.isArray(hints.possibleCapos) ? hints.possibleCapos.map(String).slice(0, 4) : [], possibleChords: Array.isArray(hints.possibleChords) ? hints.possibleChords.map(String).slice(0, 12) : [], tabReferenceCount: Number(hints.tabReferenceCount || 0), imageReferenceCount: Number(hints.imageReferenceCount || 0), textReferenceCount: Number(hints.textReferenceCount || 0) } }
function buildWebContext(event = {}) { const context = event.web_context || {}; return { title: cleanSongTitle(event.title || context.title || event.prompt || ''), artist: String(event.artist || context.artist || '').trim(), summary: String(context.summary || '').slice(0, 800), confidence: Number(context.confidence || 0), source: String(context.source || 'ai_direct'), references: sanitizeReferences(context.references), tabReferences: sanitizeReferences(context.tabReferences), arrangementHints: sanitizeHints(context.arrangementHints) } }
function normalizeKey(key = 'C') { const raw = String(key || 'C').trim().replace('♭', 'b').replace('＃', '#'); if (DEFAULT_PROGRESSIONS[raw]) return raw; if (/^Am/i.test(raw)) return 'Am'; if (/^G/i.test(raw)) return 'G'; if (/^D/i.test(raw)) return 'D'; if (/^A/i.test(raw)) return 'A'; if (/^E/i.test(raw)) return 'E'; if (/^F/i.test(raw)) return 'F'; return 'C' }
function uniqueChords(chords = []) { return Array.from(new Set((Array.isArray(chords) ? chords : []).map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 12) }
function isChordSequence(chords = []) { return Array.isArray(chords) && chords.length >= 4 && chords.every((chord) => /^[A-G](?:#|b|♭)?m?(?:maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b|♭)?)?$/.test(String(chord || '').trim())) }
function normalizeProgressions(progressions = {}) { const out = {}; PROFILE_SECTIONS.forEach((key) => { const seq = progressions[key]; if (isChordSequence(seq)) out[key] = seq.slice(0, 12) }); return out }
function profileIsUsable(profile = {}) { return profile && cleanSongTitle(profile.title) && isChordSequence(profile.chords) && Object.keys(normalizeProgressions(profile.progressions)).length >= 4 }
function normalizeProfile(raw = {}, source = 'custom_profile') {
  const title = cleanSongTitle(raw.title || raw.song_title || '')
  const artist = String(raw.artist || raw.artist_name || '').trim()
  const progressions = normalizeProgressions(raw.progressions || {})
  const chords = uniqueChords(raw.chords || Object.values(progressions).flat())
  const normalized = { title, artist, aliases: raw.aliases || [], key: normalizeKey(raw.key || raw.song_key || 'C'), capo: String(raw.capo || '0品'), bpm: Number(raw.bpm || 84), strumming: String(raw.strumming || '下 下上 空上 下上'), chords, progressions, source, matchLevel: raw.matchLevel || source }
  return profileIsUsable(normalized) ? normalized : null
}
function findBuiltInProfile(title = '', artist = '') { const key = `${compact(title)}${compact(artist)}`; return SONG_PROFILES.find((item) => [item.title, item.artist, ...(item.aliases || [])].some((word) => key.includes(compact(word)) || compact(word).includes(compact(title)))) || null }
async function findCloudProfile(title = '', artist = '') {
  const titleKey = compact(title)
  const artistKey = compact(artist)
  if (!titleKey) return null
  try {
    const exact = await songProfiles.where({ search_key: titleKey, status: _.neq('disabled') }).limit(1).get()
    if (exact.data?.[0]) return normalizeProfile(exact.data[0], 'cloud_song_profile')
    const rows = await songProfiles.where({ aliases_compact: _.in([titleKey, `${titleKey}${artistKey}`].filter(Boolean)), status: _.neq('disabled') }).limit(1).get()
    if (rows.data?.[0]) return normalizeProfile(rows.data[0], 'cloud_song_profile')
  } catch (error) {
    console.log('song profile lookup skipped', error?.message || error)
  }
  return null
}
async function resolveSongProfile(webContext = {}, event = {}) {
  const title = webContext.title || event.title || event.prompt || ''
  const artist = webContext.artist || event.artist || ''
  return await findCloudProfile(title, artist) || findBuiltInProfile(title, artist)
}
function bars(chords = []) { return `| ${chords.join(' | ')} |` }
function splitBars(chords = [], size = 4) { const chunks = []; for (let i = 0; i < chords.length; i += size) chunks.push(chords.slice(i, i + size)); return chunks }
function makeSection(name, chords, instruction) { return { name, lines: splitBars(chords, 4).map((part, index) => ({ chordLine: bars(part), lyricLine: `${instruction}${splitBars(chords, 4).length > 1 ? ` · 第${index + 1}组` : ''}` })) } }
function buildArrangementFromProfile(profile = {}, reason = 'known_song_profile') {
  const progressions = normalizeProgressions(profile.progressions)
  const sections = PROFILE_SECTIONS.filter((key) => progressions[key]).map((key) => makeSection(SECTION_NAMES[key], progressions[key], SECTION_TIPS[key]))
  return { title: `${profile.title} AI完整曲谱`, style: '弹唱', song_key: profile.key, bpm: profile.bpm, capo: profile.capo, difficulty: '新手', strumming: profile.strumming, chords: uniqueChords(profile.chords), sections, practiceTips: [
    `本谱按《${profile.title}》${profile.artist ? profile.artist : ''}的常见弹唱结构生成，建议先用 ${Math.max(60, Number(profile.bpm || 84) - 12)} BPM 慢练。`,
    `右手节奏：${profile.strumming}。先空弦练 2 分钟，再加入左手和弦。`,
    `每个竖线之间是 1 小节；副歌可循环练：${bars((progressions.chorus || []).slice(0, 4))}。`,
    '本谱为 AI 简化练习版，不含完整歌词，不声称官方或原版。',
  ], generationMode: reason, arrangementProfile: { title: profile.title, artist: profile.artist, source: profile.source, matchLevel: profile.matchLevel } }
}
function buildPracticeArrangement(event = {}, webContext = {}, reason = 'practice_only') {
  const title = cleanSongTitle(webContext.title || event.title || event.prompt || '目标歌曲') || '目标歌曲'
  const key = normalizeKey(event.song_key || webContext.arrangementHints?.possibleKeys?.[0] || 'C')
  const chords = DEFAULT_PROGRESSIONS[key] || DEFAULT_PROGRESSIONS.C
  const progressions = { intro: chords, verseA: [...chords, ...chords], verseB: [...chords.slice().reverse(), ...chords], chorus: [...chords, ...chords], bridge: [...chords.slice(1), chords[0], ...chords], outro: chords }
  return buildArrangementFromProfile({ title, artist: webContext.artist || event.artist || '', key, capo: '0品', bpm: 84, strumming: '下 下上 空上 下上', chords, progressions, source: 'practice_fallback', matchLevel: reason }, reason)
}
function normalizeSectionLines(lines = []) { return lines.map((line) => { if (!line) return null; if (typeof line === 'string') return { chordLine: '', lyricLine: line }; return { chordLine: String(line.chordLine || line.chord || '').trim(), lyricLine: String(line.lyricLine || line.lyric || line.text || '').trim() } }).filter((line) => line && (line.lyricLine || line.chordLine)) }
function isPlayablePayload(payload = {}) { return Array.isArray(payload.sections) && payload.sections.length >= 4 && payload.sections.reduce((sum, section) => sum + normalizeSectionLines(section.lines || []).length, 0) >= 8 && uniqueChords(payload.chords).length >= 4 }
function normalizeSongPayload(payload = {}, fallback = {}) { const source = isPlayablePayload(payload) ? payload : fallback; const sections = source.sections.map((section) => ({ name: String(section?.name || '正文'), lines: normalizeSectionLines(section?.lines || []) })).filter((section) => section.lines.length); return { title: String(source.title || fallback.title || 'AI完整曲谱'), style: String(source.style || fallback.style || '弹唱'), song_key: String(source.song_key || source.key || fallback.song_key || 'C'), bpm: Number(source.bpm || fallback.bpm || 84), capo: String(source.capo || fallback.capo || '0品'), difficulty: String(source.difficulty || fallback.difficulty || '新手'), strumming: String(source.strumming || fallback.strumming || '下 下上 空上 下上'), chords: uniqueChords(source.chords).length ? uniqueChords(source.chords) : uniqueChords(fallback.chords), sections, practiceTips: Array.isArray(source.practiceTips) && source.practiceTips.length ? source.practiceTips.map(String).slice(0, 5) : fallback.practiceTips, generationMode: source.generationMode || fallback.generationMode || 'ai_repaired', arrangementProfile: source.arrangementProfile || fallback.arrangementProfile || null } }
function sectionsToRawText(sections = []) { return sections.map((section) => `[${section.name}]\n${section.lines.map((line) => line.chordLine ? `${line.chordLine}\n${line.lyricLine}` : line.lyricLine).join('\n')}`).join('\n\n') }
function chordRoot(chord = '') { return String(chord || '').replace(/\/.*$/, '').trim() }
function shapeFor(chord = '') { return CHORD_SHAPES[chordRoot(chord)] || ['x', 'x', 'x', 'x', 'x', 'x'] }
function padCell(text = '', width = 8) { const raw = String(text || '').slice(0, width); return raw + ' '.repeat(Math.max(0, width - raw.length)) }
function parseChordBar(line = '') { return String(line || '').split('|').map((item) => item.trim()).filter(Boolean).flatMap((cell) => cell.split(/\s+/).filter(Boolean)).slice(0, 4) }
function buildSixLineBlock(chordLine = '', lyricLine = '') { const chords = parseChordBar(chordLine).length ? parseChordBar(chordLine) : ['C', 'G', 'Am', 'F']; const stringNames = ['E', 'A', 'D', 'G', 'B', 'e']; const header = `     ${chords.map((chord) => padCell(chord, 8)).join('')}`; const lines = stringNames.map((name, stringIndex) => `${name}|${chords.map((chord) => `--${shapeFor(chord)[stringIndex]}---${shapeFor(chord)[stringIndex]}-`).join('')}|`); return [header, ...lines.reverse(), `节奏 ${chords.map(() => '↓ ↓↑ ↑↓↑').join(' | ')}`, `提示 ${String(lyricLine || '').slice(0, 36)}`] }
function buildImageTabPages(sections = [], meta = {}) { const pages = []; let blocks = [{ type: 'section', text: `${meta.title || 'AI完整曲谱'}｜${meta.song_key || 'C'}调｜${meta.capo || '0品'}｜${meta.bpm || 84} BPM` }, { type: 'tab', lines: [`右手节奏：${meta.strumming || '下 下上 空上 下上'}`, `常用和弦：${(meta.chords || []).join('  ')}`] }]; sections.forEach((section) => { blocks.push({ type: 'section', text: section.name }); section.lines.forEach((line) => { blocks.push({ type: 'tab', lines: buildSixLineBlock(line.chordLine, line.lyricLine) }); if (blocks.length >= 6) { pages.push({ title: `${meta.title || '图片六线谱'} · 第${pages.length + 1}页`, blocks }); blocks = [] } }) }); if (blocks.length) pages.push({ title: `${meta.title || '图片六线谱'} · 第${pages.length + 1}页`, blocks }); return pages }
function buildSongPrompt(event, webContext) { const title = cleanSongTitle(webContext.title || event.title || event.prompt || ''); const artist = webContext.artist || event.artist || ''; return `只输出JSON，不能有markdown。你是吉他弹唱编配助手。请判断你是否能可靠给出《${title}》${artist ? artist : ''}的简化弹唱结构。若不确定真实歌曲和弦结构，请输出 {"status":"need_profile","confidence":0}。若确定，请输出 JSON：title, style, song_key, bpm, capo, difficulty, strumming, chords, sections, practiceTips, confidence。sections 至少包含前奏、主歌A、主歌B、副歌、桥段/间奏、尾奏；每行 chordLine 必须用 | C | G | Am | F | 小节线格式；lyricLine 只写练习提示，不写原歌词。` }
function resolveEnvId(wxContext) { return process.env.TCB_ENV || process.env.CLOUDBASE_ENV_ID || process.env.SCF_NAMESPACE || wxContext?.ENV || undefined }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
function getErrorCode(error) { return String(error?.code || error?.statusCode || '') }
function withTimeout(promise, ms) { return Promise.race([promise, new Promise((_r, reject) => setTimeout(() => reject(new Error('AI模型响应超时')), ms))]) }
async function callCloudbaseModel(event, wxContext, webContext) { const envId = resolveEnvId(wxContext); const app = envId ? tcb.init({ env: envId }) : tcb.init(); const providerCandidates = Array.from(new Set([event.provider || 'hunyuan-v3', 'hunyuan-v3', 'hunyuan-open', 'hunyuan-exp', 'hunyuan', 'cloudbase'])); let lastError; for (const provider of providerCandidates) { const model = app.ai().createModel(provider); for (let attempt = 1; attempt <= 2; attempt += 1) { try { return normalizeText(await withTimeout(model.generateText({ model: event.model || 'hy3-preview', messages: [{ role: 'user', content: buildSongPrompt(event, webContext) }], temperature: 0.15 }), 9000)) } catch (error) { lastError = error; if (getErrorCode(error) === '429' && attempt < 2) { await sleep(450 * attempt); continue } if (getErrorCode(error) === '429') break } } } throw lastError || new Error('AI 模型调用失败') }
async function getCurrentUser(openid) { const result = await users.where({ openid }).limit(1).get(); return result.data[0] || null }
async function ensureUser(openid, now) { let user = await getCurrentUser(openid); if (user) return user; const seed = { openid, nickname: '谱灵用户', avatar_url: '', membership_type: 'free', generation_quota: 10, daily_free_quota: 5, total_generated: 0, works_count: 0, followers_count: 0, following_count: 0, likes_count: 0, status: 'active', created_at: now, updated_at: now, last_login_at: now }; const created = await users.add({ data: seed }); return { _id: created._id, ...seed } }

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || 'debug-openid'
  const now = new Date()
  const webContext = buildWebContext(event)
  const isWebChords = event.type === 'web_chords'
  const sourceText = String(event.prompt || event.lyrics || event.title || webContext.title || webContext.summary || '')
  if (!reviewContent(sourceText)) return { code: 403, message: '内容审核未通过，请调整后重试' }
  const user = await ensureUser(openid, now)
  if ((user.generation_quota || 0) <= 0 && user.membership_type === 'free') return { code: 403, message: '今日免费额度已用完，请明日再试' }

  let arrangement = null
  let modelStatus = 'profile_not_found'
  let modelErrorMessage = ''
  const resolvedProfile = isWebChords ? await resolveSongProfile(webContext, event) : null

  if (resolvedProfile) {
    arrangement = buildArrangementFromProfile(resolvedProfile, resolvedProfile.matchLevel || 'known_song_profile')
    modelStatus = resolvedProfile.source === 'cloud_song_profile' ? 'cloud_profile_success' : 'built_in_profile_success'
  } else if (isWebChords) {
    try {
      const rawModelText = await callCloudbaseModel(event, wxContext, webContext)
      const modelPayload = JSON.parse(extractJsonString(rawModelText))
      if (modelPayload.status === 'need_profile' || Number(modelPayload.confidence || 0) < 0.7 || !isPlayablePayload(modelPayload)) {
        return { code: 422, message: `暂未收录《${webContext.title || event.title || '这首歌'}》的可靠曲谱结构。为了避免生成错谱，暂不自动生成。` }
      }
      arrangement = { ...modelPayload, generationMode: 'model_confident_song_profile', arrangementProfile: { title: webContext.title || modelPayload.title, artist: webContext.artist || event.artist || '', source: 'model_confident', matchLevel: 'model_confident' } }
      modelStatus = 'model_confident_success'
    } catch (error) {
      return { code: 422, message: `暂未匹配到《${webContext.title || event.title || '这首歌'}》的可靠曲谱结构。为了避免生成错谱，暂不自动生成。` }
    }
  } else {
    arrangement = buildPracticeArrangement(event, webContext, 'original_or_practice')
    modelStatus = 'practice_generation'
  }

  const normalized = normalizeSongPayload(arrangement, arrangement)
  const rawText = sectionsToRawText(normalized.sections)
  const imageTabPages = buildImageTabPages(normalized.sections, normalized)
  const isPublic = Boolean(event.is_public) && !isWebChords
  const sourceType = isWebChords ? 'ai_web_dual_tab' : 'ai_dual_tab'
  const data = {
    user_openid: openid,
    user_id: user._id,
    title: normalized.title,
    artist_name: isWebChords ? (webContext.artist || event.artist || normalized.arrangementProfile?.artist || 'AI生成') : 'AI生成',
    original_song_title: isWebChords ? (webContext.title || event.title || normalized.arrangementProfile?.title || '') : '',
    original_artist_name: isWebChords ? (webContext.artist || event.artist || normalized.arrangementProfile?.artist || '') : '',
    style: normalized.style,
    song_key: normalized.song_key,
    bpm: normalized.bpm,
    capo: normalized.capo,
    difficulty: normalized.difficulty,
    strumming: normalized.strumming,
    tags: ['AI生成完整曲谱', '可练习', 'TXT谱', '图片六线谱', normalized.style],
    raw_text: rawText,
    content_json: { sections: normalized.sections, chords: normalized.chords, practiceTips: normalized.practiceTips, strumming: normalized.strumming, copyrightNotice: 'AI 生成的简化练习曲谱，非官方曲谱。', arrangementHints: isWebChords ? webContext.arrangementHints : null, arrangementProfile: normalized.arrangementProfile, modelStatus, modelErrorMessage, tabOutputType: 'both', imageTabPages },
    generation_source: isWebChords ? { type: 'ai_dual_tab_direct', provider: webContext.source || 'ai_direct', confidence: webContext.confidence || 0, summary: webContext.summary || '', references: webContext.references, tabReferences: webContext.tabReferences, arrangementHints: webContext.arrangementHints, arrangementProfile: normalized.arrangementProfile, modelStatus, tabOutputType: 'both' } : { type: sourceType, modelStatus, tabOutputType: 'both' },
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
