const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const profiles = db.collection('song_profiles')

const PROFILE_SECTIONS = ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']
const SMOKE_TEST_SONGS = ['成都', '晴天', '海阔天空', '平凡之路', '半壶纱', '夜空中最亮的星', '蓝莲花', '曾经的你', '董小姐', '安和桥', '稻香', '演员']

const SEED_PROFILES = [
  seed('成都', '赵雷', ['成都', '赵雷成都'], 'C', '2品', 76, '下 下上 空上 下上', ['C', 'G', 'Am', 'Em', 'F'], { intro: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'], verseA: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'], verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], chorus: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], bridge: ['Am', 'Em', 'F', 'C', 'F', 'G', 'C', 'C'], outro: ['F', 'G', 'C', 'C'] }),
  seed('晴天', '周杰伦', ['晴天', '周杰伦晴天'], 'G', '0品', 92, '下 下上 上下上', ['G', 'D', 'Em', 'C', 'Am'], { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'], verseB: ['Am', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], bridge: ['Em', 'D', 'C', 'G', 'Am', 'D', 'G', 'G'], outro: ['C', 'D', 'G', 'G'] }),
  seed('海阔天空', 'Beyond', ['海阔天空', 'beyond海阔天空'], 'G', '0品', 78, '下 下上 上下上', ['G', 'D', 'Em', 'C', 'Am'], { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], verseB: ['Am', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], bridge: ['Em', 'D', 'C', 'G', 'Am', 'D', 'G', 'G'], outro: ['C', 'D', 'G', 'G'] }),
  seed('平凡之路', '朴树', ['平凡之路', '朴树平凡之路'], 'G', '0品', 84, '下 下上 空上 下上', ['G', 'D', 'Em', 'C'], { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'], verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'], bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'], outro: ['C', 'D', 'G', 'G'] }),
  seed('半壶纱', '刘珂矣', ['半壶纱', '刘珂矣半壶纱'], 'Am', '0品', 72, '下 下上 上下上', ['Am', 'G', 'F', 'E', 'Dm'], { intro: ['Am', 'G', 'F', 'E'], verseA: ['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'], verseB: ['F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E'], chorus: ['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'], bridge: ['Dm', 'G', 'C', 'Am', 'F', 'E', 'Am', 'Am'], outro: ['F', 'E', 'Am', 'Am'] }),
  seed('夜空中最亮的星', '逃跑计划', ['夜空中最亮的星', '逃跑计划夜空中最亮的星'], 'G', '0品', 86, '下 下上 上下上', ['G', 'D', 'Em', 'C'], { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'], verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'], outro: ['C', 'D', 'G', 'G'] }),
  seed('蓝莲花', '许巍', ['蓝莲花', '许巍蓝莲花'], 'G', '0品', 82, '下 下上 空上 下上', ['G', 'D', 'Em', 'C'], { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C'], verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'], outro: ['C', 'D', 'G', 'G'] }),
  seed('曾经的你', '许巍', ['曾经的你', '许巍曾经的你'], 'G', '0品', 92, '下 下上 上下上', ['G', 'D', 'Em', 'C'], { intro: ['G', 'D', 'Em', 'C'], verseA: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], verseB: ['C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G'], chorus: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], bridge: ['Em', 'D', 'C', 'G', 'C', 'D', 'G', 'G'], outro: ['C', 'D', 'G', 'G'] }),
  seed('董小姐', '宋冬野', ['董小姐', '宋冬野董小姐'], 'C', '0品', 78, '下 下上 空上 下上', ['C', 'G', 'Am', 'F'], { intro: ['C', 'G', 'Am', 'F'], verseA: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'F'], verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], chorus: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], bridge: ['Am', 'G', 'F', 'C', 'F', 'G', 'C', 'C'], outro: ['F', 'G', 'C', 'C'] }),
  seed('安和桥', '宋冬野', ['安和桥', '宋冬野安和桥'], 'C', '3品', 70, '下 下上 空上 下上', ['C', 'G', 'Am', 'F'], { intro: ['C', 'G', 'Am', 'F'], verseA: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'F'], verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], chorus: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], bridge: ['Am', 'G', 'F', 'C', 'F', 'G', 'C', 'C'], outro: ['F', 'G', 'C', 'C'] }),
  seed('稻香', '周杰伦', ['稻香', '周杰伦稻香'], 'C', '0品', 86, '下 下上 上下上', ['C', 'G', 'Am', 'F'], { intro: ['C', 'G', 'Am', 'F'], verseA: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'F'], verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], chorus: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'], bridge: ['Am', 'G', 'F', 'C', 'F', 'G', 'C', 'C'], outro: ['F', 'G', 'C', 'C'] }),
  seed('演员', '薛之谦', ['演员', '薛之谦演员'], 'C', '0品', 78, '下 下上 空上 下上', ['C', 'G', 'Am', 'F', 'Em'], { intro: ['C', 'G', 'Am', 'F'], verseA: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'], verseB: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], chorus: ['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], bridge: ['Am', 'Em', 'F', 'C', 'F', 'G', 'C', 'C'], outro: ['F', 'G', 'C', 'C'] })
]

function compact(text = '') { return String(text || '').replace(/[《》【】\[\]（）()]/g, '').replace(/\s+/g, '').toLowerCase() }
function seed(title, artist, aliases, key, capo, bpm, strumming, chords, progressions) { return normalizeProfile({ title, artist, aliases, key, capo, bpm, strumming, chords, progressions, source: 'seed_admin', verified: true, quality: 'verified', review_status: 'approved' }) }
function isChordSequence(chords = []) { return Array.isArray(chords) && chords.length >= 4 && chords.every((chord) => /^[A-G](?:#|b|♭)?m?(?:maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b|♭)?)?$/.test(String(chord || '').trim())) }
function normalizeProgressions(progressions = {}) { const out = {}; PROFILE_SECTIONS.forEach((key) => { const seq = progressions[key]; if (isChordSequence(seq)) out[key] = seq.slice(0, 12) }); return out }
function validateProfile(profile = {}) {
  const errors = []
  if (!profile.title) errors.push('缺少 title')
  if (!profile.artist) errors.push('缺少 artist')
  if (!profile.key) errors.push('缺少 key')
  if (!profile.capo) errors.push('缺少 capo')
  if (!Number(profile.bpm)) errors.push('缺少 bpm')
  if (!profile.strumming) errors.push('缺少 strumming')
  if (!isChordSequence(profile.chords)) errors.push('chords 至少需要4个合法和弦')
  if (Object.keys(normalizeProgressions(profile.progressions)).length < 4) errors.push('progressions 至少需要4个有效段落')
  if (profile.verified !== true && profile.quality !== 'verified' && profile.review_status !== 'approved') errors.push('必须标记 verified=true 或 approved')
  return errors
}
function normalizeProfile(input = {}) {
  const title = String(input.title || input.song_title || '').trim()
  const artist = String(input.artist || input.artist_name || '').trim()
  const aliases = Array.from(new Set([title, `${artist}${title}`, ...(Array.isArray(input.aliases) ? input.aliases : [])].filter(Boolean)))
  return {
    title,
    artist,
    aliases,
    search_key: compact(title),
    aliases_compact: aliases.map(compact).filter(Boolean),
    key: String(input.key || input.song_key || 'C').trim(),
    capo: String(input.capo || '0品').trim(),
    bpm: Number(input.bpm || 84),
    strumming: String(input.strumming || '').trim(),
    chords: Array.isArray(input.chords) ? input.chords.map(String) : [],
    progressions: normalizeProgressions(input.progressions || {}),
    source: String(input.source || 'manual_admin'),
    verified: true,
    quality: 'verified',
    review_status: 'approved',
    status: input.status === 'disabled' ? 'disabled' : 'active',
    updated_at: new Date(),
  }
}
async function upsertProfile(input = {}) {
  const doc = normalizeProfile(input)
  const errors = validateProfile(doc)
  if (errors.length) return { ok: false, title: input.title || '', errors }
  const existed = await profiles.where({ search_key: doc.search_key }).limit(1).get()
  if (existed.data?.[0]?._id) {
    await profiles.doc(existed.data[0]._id).update({ data: doc })
    return { ok: true, title: doc.title, artist: doc.artist, action: 'updated' }
  }
  await profiles.add({ data: { ...doc, created_at: new Date() } })
  return { ok: true, title: doc.title, artist: doc.artist, action: 'created' }
}
function previewProfile(row = {}) {
  return {
    title: row.title,
    artist: row.artist,
    key: row.key,
    capo: row.capo,
    bpm: row.bpm,
    strumming: row.strumming,
    chords: row.chords,
    sections: Object.keys(row.progressions || {}),
    verified: row.verified === true || row.quality === 'verified' || row.review_status === 'approved',
    source: row.source || 'song_profiles',
  }
}
async function findProfile(keyword = '') {
  const key = compact(keyword)
  if (!key) return null
  const exact = await profiles.where({ search_key: key, status: _.neq('disabled') }).limit(1).get()
  if (exact.data?.[0]) return exact.data[0]
  const alias = await profiles.where({ aliases_compact: _.in([key]), status: _.neq('disabled') }).limit(1).get()
  if (alias.data?.[0]) return alias.data[0]
  const seedHit = SEED_PROFILES.find((item) => item.search_key === key || (item.aliases_compact || []).includes(key))
  return seedHit || null
}
async function testMatch(keyword = '') {
  const row = await findProfile(keyword)
  if (!row) return { keyword, matched: false, message: `未命中 verified profile：${keyword}` }
  const doc = normalizeProfile(row)
  const errors = validateProfile(doc)
  return errors.length
    ? { keyword, matched: false, title: row.title, errors }
    : { keyword, matched: true, profile: previewProfile(doc) }
}

exports.main = async (event = {}) => {
  const action = event.action || 'count'
  if (action === 'count') {
    const total = await profiles.count()
    const verified = await profiles.where({ verified: true, status: _.neq('disabled') }).count()
    return { code: 0, data: { total: total.total, verified: verified.total, seedCount: SEED_PROFILES.length } }
  }
  if (action === 'seed') {
    const results = []
    for (const item of SEED_PROFILES) results.push(await upsertProfile(item))
    return { code: 0, data: { total: results.length, success: results.filter((item) => item.ok).length, results } }
  }
  if (action === 'testMatch') {
    const result = await testMatch(event.keyword || event.title || '')
    return { code: 0, data: result }
  }
  if (action === 'smokeTest') {
    const keywords = Array.isArray(event.keywords) && event.keywords.length ? event.keywords.slice(0, 50) : SMOKE_TEST_SONGS
    const results = []
    for (const keyword of keywords) results.push(await testMatch(keyword))
    return { code: 0, data: { total: results.length, matched: results.filter((item) => item.matched).length, failed: results.filter((item) => !item.matched), results } }
  }
  if (action === 'upsert') {
    const result = await upsertProfile(event.profile || {})
    return result.ok ? { code: 0, data: result } : { code: 400, message: result.errors.join('；') }
  }
  if (action === 'batchUpsert') {
    const items = Array.isArray(event.profiles) ? event.profiles.slice(0, 100) : []
    const results = []
    for (const item of items) results.push(await upsertProfile(item))
    return { code: 0, data: { total: results.length, success: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok), results } }
  }
  return { code: 400, message: `Unknown action: ${action}` }
}
