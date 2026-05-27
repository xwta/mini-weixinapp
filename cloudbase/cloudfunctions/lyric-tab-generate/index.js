const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const users = db.collection('users')
const songs = db.collection('songs')

const DAILY_FREE_LIMIT = 5
const DEFAULT_CHORDS = {
  C: ['C', 'G', 'Am', 'F'],
  G: ['G', 'D', 'Em', 'C'],
  D: ['D', 'A', 'Bm', 'G'],
  A: ['A', 'E', 'F#m', 'D'],
  E: ['E', 'B', 'C#m', 'A'],
  F: ['F', 'C', 'Dm', 'Bb'],
  Am: ['Am', 'G', 'F', 'E'],
}

function todayKey(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
function cleanTitle(text = '') {
  return String(text || '').replace(/[《》【】\[\]（）()]/g, ' ').replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|歌词/g, ' ').replace(/\s+/g, ' ').trim()
}
function normalizeKey(key = 'C') {
  const raw = String(key || 'C').trim()
  return DEFAULT_CHORDS[raw] ? raw : 'C'
}
function splitLyrics(text = '') {
  return String(text || '').split(/\n+/).map(line => line.trim()).filter(Boolean).slice(0, 80)
}
function pickSectionName(index, total) {
  if (index < 2) return '主歌A'
  if (index < Math.max(4, Math.ceil(total * 0.55))) return '主歌B'
  if (index < Math.max(6, Math.ceil(total * 0.85))) return '副歌'
  return '尾奏'
}
function groupLines(lines, key = 'C') {
  const chords = DEFAULT_CHORDS[key] || DEFAULT_CHORDS.C
  const buckets = []
  let current = null
  lines.forEach((lyric, index) => {
    const name = pickSectionName(index, lines.length)
    if (!current || current.name !== name) {
      current = { name, lines: [] }
      buckets.push(current)
    }
    const base = index % chords.length
    const row = [chords[base], chords[(base + 1) % chords.length], chords[(base + 2) % chords.length], chords[(base + 3) % chords.length]]
    current.lines.push({ chordLine: `| ${row.join(' | ')} |`, lyricLine: lyric })
  })
  return buckets
}
function sectionsToRawText(sections = []) {
  return sections.map(section => `[${section.name}]\n${section.lines.map(line => `${line.chordLine}\n${line.lyricLine}`).join('\n')}`).join('\n\n')
}
function buildImageTabPages(sections = [], meta = {}) {
  const pages = []
  let blocks = [{ type: 'section', text: `${meta.title}｜${meta.song_key}调｜${meta.capo}｜${meta.bpm} BPM` }]
  sections.forEach(section => {
    blocks.push({ type: 'section', text: section.name })
    section.lines.forEach(line => {
      blocks.push({ type: 'tab', lines: [line.chordLine, line.lyricLine] })
      if (blocks.length >= 8) {
        pages.push({ title: `${meta.title} · 第${pages.length + 1}页`, blocks })
        blocks = []
      }
    })
  })
  if (blocks.length) pages.push({ title: `${meta.title} · 第${pages.length + 1}页`, blocks })
  return pages
}
async function getCurrentUser(openid) {
  const result = await users.where({ openid }).limit(1).get()
  return result.data[0] || null
}
function buildNewUser(openid, now) {
  const date = todayKey(now)
  return { openid, nickname: '谱灵用户', avatar_url: '', membership_type: 'free', quota_policy: 'daily', daily_free_limit: DAILY_FREE_LIMIT, daily_free_quota: DAILY_FREE_LIMIT, daily_used_count: 0, quota_date: date, generation_quota: DAILY_FREE_LIMIT, total_generated: 0, works_count: 0, status: 'active', created_at: now, updated_at: now, last_login_at: now }
}
async function ensureUser(openid, now) {
  const user = await getCurrentUser(openid)
  if (user) return user
  const seed = buildNewUser(openid, now)
  const created = await users.add({ data: seed })
  return { _id: created._id, ...seed }
}
function isUnlimited(user = {}) {
  return user.quota_policy === 'unlimited' || user.membership_type === 'unlimited' || user.membership_type === 'admin' || !user.quota_policy
}
function prepareQuota(user = {}, now = new Date()) {
  if (isUnlimited(user)) return { ok: true, policy: 'unlimited', remaining: -1, used: 0, limit: -1, date: todayKey(now) }
  const date = todayKey(now)
  const limit = Number(user.daily_free_limit || user.daily_free_quota || DAILY_FREE_LIMIT)
  const used = user.quota_date === date ? Number(user.daily_used_count || 0) : 0
  const remaining = Math.max(0, limit - used)
  return { ok: remaining > 0, policy: 'daily', remaining, used, limit, date }
}
function quotaPatch(quota, now) {
  if (quota.policy === 'unlimited') return { updated_at: now }
  const nextUsed = Number(quota.used || 0) + 1
  return { quota_policy: 'daily', daily_free_limit: quota.limit, daily_free_quota: quota.limit, daily_used_count: nextUsed, quota_date: quota.date, generation_quota: Math.max(0, quota.limit - nextUsed), updated_at: now }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || 'debug-openid'
  const now = new Date()
  const title = cleanTitle(event.title || event.song_title || '歌词弹唱谱')
  const lyrics = splitLyrics(event.lyrics || event.text || '')
  if (lyrics.length < 2) return { code: 422, message: '请粘贴至少两行歌词，才能生成带歌词弹唱谱。' }
  const user = await ensureUser(openid, now)
  const quota = prepareQuota(user, now)
  if (!quota.ok) return { code: 403, message: `今日免费生成次数已用完，明天将自动恢复 ${quota.limit || DAILY_FREE_LIMIT} 次。` }

  const songKey = normalizeKey(event.song_key || event.key || 'C')
  const chords = DEFAULT_CHORDS[songKey]
  const sections = groupLines(lyrics, songKey)
  const imageTabPages = buildImageTabPages(sections, { title, song_key: songKey, capo: event.capo || '0品', bpm: Number(event.bpm || 84) })
  const data = {
    user_openid: openid,
    user_id: user._id,
    title: `${title} 歌词弹唱谱`,
    artist_name: String(event.artist || ''),
    original_song_title: title,
    original_artist_name: String(event.artist || ''),
    style: '弹唱',
    song_key: songKey,
    bpm: Number(event.bpm || 84),
    capo: String(event.capo || '0品'),
    difficulty: String(event.difficulty || '新手'),
    strumming: String(event.strumming || '下 下上 空上 下上'),
    tags: ['歌词弹唱谱', '用户提供歌词', 'TXT谱', '图片六线谱'],
    raw_text: sectionsToRawText(sections),
    content_json: { sections, chords, practiceTips: ['歌词由用户提供，本页仅做学习练习排版。', '先慢速读歌词换和弦，再逐步加入扫弦。'], strumming: String(event.strumming || '下 下上 空上 下上'), copyrightNotice: '歌词内容由用户提供，仅供个人学习练习使用。', tabOutputType: 'both', lyricSource: 'user_provided', imageTabPages },
    generation_source: { type: 'user_lyrics_tab', lyricSource: 'user_provided', tabOutputType: 'both' },
    source_type: 'user_lyrics_tab',
    edit_mode: 'lyrics_tab',
    has_tab: true,
    is_public: false,
    visibility: 'private',
    audit_status: 'private',
    favorite_count: 0,
    like_count: 0,
    comment_count: 0,
    view_count: 0,
    practice_count: 0,
    created_at: now,
    updated_at: now,
  }
  const result = await songs.add({ data })
  await users.doc(user._id).update({ data: { ...quotaPatch(quota, now), total_generated: _.inc(1), works_count: _.inc(1) } })
  return { code: 0, data: { songId: result._id, title: data.title, style: data.style, song_key: data.song_key, bpm: data.bpm, capo: data.capo, difficulty: data.difficulty, strumming: data.strumming, chords, sections, practiceTips: data.content_json.practiceTips, source_type: data.source_type, tabOutputType: 'both', imageTabPages, lyricSource: 'user_provided' } }
}
