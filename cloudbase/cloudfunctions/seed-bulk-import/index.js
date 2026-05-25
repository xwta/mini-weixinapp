const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const songs = db.collection('songs')

const MAX_BATCH_SIZE = 100

function jsonResponse(code, dataOrMessage) {
  if (code === 0) return { code, data: dataOrMessage }
  return { code, message: dataOrMessage }
}

function uniqueStrings(items = []) {
  return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)))
}

function normalizeText(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[《》【】\[\]（）()]/g, ' ')
    .replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ')
    .trim()
}

function buildSearchKeywords(song = {}) {
  const aliases = Array.isArray(song.aliases) ? song.aliases : []
  const tags = Array.isArray(song.tags) ? song.tags : []
  const title = song.title || ''
  const artist = song.artist_name || ''
  const pinyin = song.pinyin || ''
  const initials = song.initials || ''

  return uniqueStrings([
    ...(Array.isArray(song.search_keywords) ? song.search_keywords : []),
    title,
    artist,
    `${title} ${artist}`,
    `${artist} ${title}`,
    `${title} 吉他谱`,
    `${title} 弹唱`,
    `${title} 和弦谱`,
    `${title} chords`,
    pinyin,
    initials,
    ...aliases,
    ...tags,
    song.style,
    song.song_key,
    song.difficulty,
  ])
}

function sanitizeReference(ref = {}) {
  return {
    title: String(ref.title || '').slice(0, 120),
    url: String(ref.url || '').slice(0, 500),
    snippet: String(ref.snippet || '').slice(0, 180),
    provider: String(ref.provider || 'duckduckgo').slice(0, 40),
    category: String(ref.category || 'tab_reference').slice(0, 40),
    tab_score: Number(ref.tab_score || 0),
  }
}

function sanitizeSong(input = {}, now = new Date()) {
  const title = String(input.title || '').trim().slice(0, 120)
  const artistName = String(input.artist_name || input.artist || '').trim().slice(0, 120)
  if (!title) return null

  const aliases = uniqueStrings(Array.isArray(input.aliases) ? input.aliases : [])
  const tags = uniqueStrings(['热门索引', 'AI可生成', ...(Array.isArray(input.tags) ? input.tags : [])])
  const tabReferences = (Array.isArray(input.tabReferences) ? input.tabReferences : [])
    .slice(0, 8)
    .map(sanitizeReference)
    .filter((item) => item.title || item.url || item.snippet)

  const data = {
    title,
    artist_name: artistName,
    style: input.style || '弹唱',
    song_key: input.song_key || input.key || 'C',
    bpm: Number(input.bpm || 0) || null,
    capo: input.capo || '0品',
    difficulty: input.difficulty || '新手',
    strumming: input.strumming || '',
    tags,
    aliases,
    pinyin: input.pinyin || '',
    initials: input.initials || '',
    raw_text: '',
    content_json: {
      sections: [],
      chords: [],
      practiceTips: [],
      seedNotice: '批量导入歌曲索引，暂无完整曲谱，可 AI 生成简化弹唱编配版。',
      arrangementHints: input.arrangementHints || null,
    },
    generation_source: {
      type: 'bulk_seed_search',
      provider: input.provider || 'duckduckgo',
      references: (Array.isArray(input.references) ? input.references : []).slice(0, 5).map(sanitizeReference),
      tabReferences,
      arrangementHints: input.arrangementHints || null,
    },
    source_type: 'seed_bulk',
    edit_mode: 'seed',
    has_tab: false,
    is_public: true,
    visibility: 'public',
    audit_status: 'seed',
    favorite_count: 0,
    like_count: 0,
    comment_count: 0,
    view_count: 0,
    practice_count: 0,
    created_at: now,
    updated_at: now,
  }

  data.search_keywords = buildSearchKeywords(data)
  data.search_fingerprint = normalizeText(`${title} ${artistName}`)
  return data
}

async function upsertSong(data, dryRun = false) {
  const existQuery = data.artist_name
    ? { title: data.title, artist_name: data.artist_name }
    : { title: data.title }

  const existed = await songs.where(existQuery).limit(1).get()
  if (dryRun) return existed.data.length ? 'would_update' : 'would_create'

  if (existed.data.length) {
    const id = existed.data[0]._id
    await songs.doc(id).update({
      data: {
        ...data,
        created_at: existed.data[0].created_at || data.created_at,
        updated_at: new Date(),
      },
    })
    return 'updated'
  }

  await songs.add({ data })
  return 'created'
}

exports.main = async (event = {}) => {
  const action = event.action || 'import'
  const expectedToken = process.env.SEED_IMPORT_TOKEN || ''
  const token = event.token || ''
  if (expectedToken && token !== expectedToken) return jsonResponse(403, '无权限导入')

  if (action === 'ping') {
    return jsonResponse(0, { ok: true, maxBatchSize: MAX_BATCH_SIZE })
  }

  if (action !== 'import') return jsonResponse(400, `Unknown action: ${action}`)

  const dryRun = Boolean(event.dryRun)
  const items = Array.isArray(event.items) ? event.items.slice(0, MAX_BATCH_SIZE) : []
  if (!items.length) return jsonResponse(400, 'items 不能为空')

  const now = new Date()
  let created = 0
  let updated = 0
  let skipped = 0
  const errors = []

  for (const item of items) {
    try {
      const data = sanitizeSong(item, now)
      if (!data) {
        skipped += 1
        continue
      }
      const result = await upsertSong(data, dryRun)
      if (result === 'created' || result === 'would_create') created += 1
      else if (result === 'updated' || result === 'would_update') updated += 1
      else skipped += 1
    } catch (error) {
      skipped += 1
      errors.push({ title: item?.title || '', message: error?.message || String(error) })
    }
  }

  return jsonResponse(0, {
    dryRun,
    received: items.length,
    created,
    updated,
    skipped,
    errors: errors.slice(0, 10),
  })
}
