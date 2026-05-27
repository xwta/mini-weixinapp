const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const profiles = db.collection('song_profiles')

const PROFILE_SECTIONS = ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']

const BUILT_IN = [
  item('成都', '赵雷', ['成都', '赵雷成都'], 'C', '2品', 76, '下 下上 空上 下上', ['C', 'G', 'Am', 'Em', 'F'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('晴天', '周杰伦', ['晴天', '周杰伦晴天'], 'G', '0品', 92, '下 下上 上下上', ['G', 'D', 'Em', 'C', 'Am'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('海阔天空', 'Beyond', ['海阔天空', 'beyond海阔天空'], 'G', '0品', 78, '下 下上 上下上', ['G', 'D', 'Em', 'C', 'Am'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('平凡之路', '朴树', ['平凡之路', '朴树平凡之路'], 'G', '0品', 84, '下 下上 空上 下上', ['G', 'D', 'Em', 'C'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('半壶纱', '刘珂矣', ['半壶纱', '刘珂矣半壶纱'], 'Am', '0品', 72, '下 下上 上下上', ['Am', 'G', 'F', 'E', 'Dm'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('夜空中最亮的星', '逃跑计划', ['夜空中最亮的星', '逃跑计划夜空中最亮的星'], 'G', '0品', 86, '下 下上 上下上', ['G', 'D', 'Em', 'C'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('蓝莲花', '许巍', ['蓝莲花', '许巍蓝莲花'], 'G', '0品', 82, '下 下上 空上 下上', ['G', 'D', 'Em', 'C'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('曾经的你', '许巍', ['曾经的你', '许巍曾经的你'], 'G', '0品', 92, '下 下上 上下上', ['G', 'D', 'Em', 'C'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('董小姐', '宋冬野', ['董小姐', '宋冬野董小姐'], 'C', '0品', 78, '下 下上 空上 下上', ['C', 'G', 'Am', 'F'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('安和桥', '宋冬野', ['安和桥', '宋冬野安和桥'], 'C', '3品', 70, '下 下上 空上 下上', ['C', 'G', 'Am', 'F'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('稻香', '周杰伦', ['稻香', '周杰伦稻香'], 'C', '0品', 86, '下 下上 上下上', ['C', 'G', 'Am', 'F'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
  item('演员', '薛之谦', ['演员', '薛之谦演员'], 'C', '0品', 78, '下 下上 空上 下上', ['C', 'G', 'Am', 'F', 'Em'], ['intro', 'verseA', 'verseB', 'chorus', 'bridge', 'outro']),
]

function item(title, artist, aliases, key, capo, bpm, strumming, chords, sections) {
  return { title, artist, aliases, key, capo, bpm, strumming, chords, sections, verified: true, source: 'built_in_song_profile' }
}
function compact(text = '') {
  return String(text || '').replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|六线谱|图片谱|txt谱|TXT谱|完整版|原版|简单版|新手版|教学|指弹|尤克里里/gi, '').replace(/[《》【】\[\]（）()\s\-_·,，、。:：|｜/\\]+/g, '').toLowerCase()
}
function isChordSequence(chords = []) {
  return Array.isArray(chords) && chords.length >= 4 && chords.every((chord) => /^[A-G](?:#|b|♭)?m?(?:maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b|♭)?)?$/.test(String(chord || '').trim()))
}
function normalizeProgressions(progressions = {}) {
  const out = {}
  PROFILE_SECTIONS.forEach((key) => {
    const seq = progressions[key]
    if (isChordSequence(seq)) out[key] = seq.slice(0, 12)
  })
  return out
}
function profilePreview(row = {}, source = 'song_profiles') {
  const progressions = normalizeProgressions(row.progressions || {})
  return {
    title: String(row.title || row.song_title || ''),
    artist: String(row.artist || row.artist_name || ''),
    key: String(row.key || row.song_key || 'C'),
    capo: String(row.capo || '0品'),
    bpm: Number(row.bpm || 84),
    strumming: String(row.strumming || ''),
    chords: Array.isArray(row.chords) ? row.chords.map(String).slice(0, 12) : [],
    sections: Object.keys(progressions).length ? Object.keys(progressions) : (row.sections || []),
    verified: row.verified === true || row.quality === 'verified' || row.review_status === 'approved' || source === 'built_in_song_profile',
    source,
  }
}
function isUsableProfile(row = {}, source = 'song_profiles') {
  const preview = profilePreview(row, source)
  return Boolean(preview.title && preview.artist && preview.verified && Number(preview.bpm) && preview.strumming && isChordSequence(preview.chords) && preview.sections.length >= 4)
}
async function findCloud(keyword = '') {
  const key = compact(keyword)
  if (!key) return null
  const exact = await profiles.where({ search_key: key, status: _.neq('disabled') }).limit(3).get()
  const exactHit = (exact.data || []).find((row) => isUsableProfile(row, 'cloud_song_profile'))
  if (exactHit) return profilePreview(exactHit, 'cloud_song_profile')
  const alias = await profiles.where({ aliases_compact: _.in([key]), status: _.neq('disabled') }).limit(3).get()
  const aliasHit = (alias.data || []).find((row) => isUsableProfile(row, 'cloud_song_profile'))
  if (aliasHit) return profilePreview(aliasHit, 'cloud_song_profile')
  return null
}
function findBuiltIn(keyword = '') {
  const key = compact(keyword)
  if (!key) return null
  const hit = BUILT_IN.find((row) => [row.title, row.artist, ...(row.aliases || [])].some((text) => {
    const itemKey = compact(text)
    return itemKey && (key === itemKey || key.includes(itemKey) || itemKey.includes(key))
  }))
  return hit ? profilePreview(hit, 'built_in_song_profile') : null
}
async function testMatch(keyword = '') {
  const cloudHit = await findCloud(keyword)
  const profile = cloudHit || findBuiltIn(keyword)
  if (!profile) return { keyword, matched: false, message: `暂未收录《${keyword || '这首歌'}》的可靠曲谱结构。` }
  return { keyword, matched: true, profile }
}

exports.main = async (event = {}) => {
  const keyword = String(event.keyword || event.title || '').trim()
  if (!keyword) return { code: 400, message: '请输入歌曲名' }
  const result = await testMatch(keyword)
  return { code: 0, data: result }
}
