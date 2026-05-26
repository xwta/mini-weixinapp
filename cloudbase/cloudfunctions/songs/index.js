const cloud = require('wx-server-sdk')
const seedSongs = require('./seed-songs.json')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const songs = db.collection('songs')
const users = db.collection('users')
const follows = db.collection('follows')
const practiceRecords = db.collection('practice_records')

const MAX_QUERY_LIMIT = 100
const MAX_SEARCH_SCAN = 3000

function toSongId(item = {}) {
  return item.id || item._id
}

function normalizeSong(item = {}) {
  return {
    ...item,
    id: toSongId(item),
    has_tab: item.has_tab !== false,
    favorite_count: Number(item.favorite_count || 0),
    like_count: Number(item.like_count || 0),
    view_count: Number(item.view_count || 0),
    comment_count: Number(item.comment_count || 0),
    practice_count: Number(item.practice_count || 0),
  }
}

function normalizeText(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[《》【】\[\]（）()]/g, ' ')
    .replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|歌词|歌曲|简谱|完整版|原版|c调|g调|d调|a调|e调|f调|b调|新手|简单版|教学|指弹|尤克里里/g, ' ')
    .replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ')
    .trim()
}

function normalizeCompact(text = '') {
  return normalizeText(text).replace(/\s+/g, '')
}

function escapeRegExp(text = '') {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function uniqueStrings(items = []) {
  return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)))
}

function buildSearchVariants(keyword = '') {
  const raw = String(keyword || '').trim()
  const normalized = normalizeText(raw)
  const compact = normalizeCompact(raw)
  const tokens = normalized.split(' ').filter((token) => token.length >= 1)
  return uniqueStrings([
    raw,
    normalized,
    compact,
    ...tokens,
    ...tokens.map((token) => token.replace(/调$/, '')),
  ]).filter((item) => item.length >= 1).slice(0, 8)
}

function buildSearchKeywords(song = {}) {
  const aliases = Array.isArray(song.aliases) ? song.aliases : []
  const tags = Array.isArray(song.tags) ? song.tags : Array.isArray(song.tags_json) ? song.tags_json : []
  const existing = Array.isArray(song.search_keywords) ? song.search_keywords : []
  const title = song.title || ''
  const artist = song.artist_name || song.author_name || ''
  const pinyin = song.pinyin || ''
  const initials = song.initials || ''

  return uniqueStrings([
    ...existing,
    title,
    artist,
    `${title} ${artist}`,
    `${artist} ${title}`,
    `${title} 吉他谱`,
    `${title} 弹唱`,
    `${title} 和弦`,
    `${title} chords`,
    normalizeCompact(title),
    pinyin,
    initials,
    ...aliases,
    ...tags,
    song.style,
    song.song_key,
    song.difficulty,
  ])
}

function buildSearchText(song = {}) {
  return uniqueStrings([
    song.title,
    song.artist_name,
    song.author_name,
    song.pinyin,
    song.initials,
    song.search_fingerprint,
    ...(Array.isArray(song.aliases) ? song.aliases : []),
    ...(Array.isArray(song.search_keywords) ? song.search_keywords : []),
    ...(Array.isArray(song.tags) ? song.tags : []),
  ]).map(normalizeText).join(' ')
}

function scoreSong(item = {}, rawKeyword = '') {
  const keyword = normalizeText(rawKeyword)
  const compactKeyword = normalizeCompact(rawKeyword)
  if (!keyword) return 1

  const title = normalizeText(item.title)
  const compactTitle = normalizeCompact(item.title)
  const artist = normalizeText(item.artist_name || item.author_name)
  const pinyin = normalizeText(item.pinyin)
  const initials = normalizeText(item.initials)
  const aliases = (Array.isArray(item.aliases) ? item.aliases : []).map(normalizeText)
  const searchKeywords = buildSearchKeywords(item).map(normalizeText)
  const haystack = uniqueStrings([title, compactTitle, artist, pinyin, initials, ...aliases, ...searchKeywords, buildSearchText(item)]).join(' ')
  const tokens = keyword.split(' ').filter(Boolean)

  let score = 0
  if (title === keyword || compactTitle === compactKeyword) score += 160
  if (artist && `${title} ${artist}` === keyword) score += 135
  if (artist && `${artist} ${title}` === keyword) score += 135
  if (title && title.includes(keyword)) score += 115
  if (compactTitle && compactKeyword && compactTitle.includes(compactKeyword)) score += 112
  if (keyword.includes(title) && title.length >= 2) score += 96
  if (compactKeyword.includes(compactTitle) && compactTitle.length >= 2) score += 96
  if (artist && artist.includes(keyword)) score += 72
  if (pinyin && pinyin.includes(keyword)) score += 68
  if (initials && initials === compactKeyword) score += 82
  if (aliases.some((alias) => alias.includes(keyword) || keyword.includes(alias))) score += 78
  if (searchKeywords.some((word) => word === keyword || normalizeCompact(word) === compactKeyword)) score += 74
  if (searchKeywords.some((word) => word.includes(keyword) || keyword.includes(word) || normalizeCompact(word).includes(compactKeyword))) score += 54

  const tokenHits = tokens.filter((token) => haystack.includes(token)).length
  score += tokenHits * 22

  if (item.has_tab === false) score -= 4
  if (item.source_type === 'seed' || item.source_type === 'seed_bulk') score += 8
  score += Math.min(20, Number(item.like_count || 0) * 0.2)
  score += Math.min(16, Number(item.favorite_count || 0) * 0.2)
  score += Math.min(12, Number(item.view_count || 0) * 0.02)

  return score
}

function parseRawTab(rawText = '') {
  const sections = []
  let current = { name: '正文', lines: [] }
  let pendingChord = null
  const chordTokens = ['C', 'G', 'Am', 'F', 'Em', 'Dm', 'D', 'A', 'E', 'Bm']

  rawText.split('\n').forEach((rawLine) => {
    const line = rawLine.trimEnd()
    if (!line.trim()) return

    if (line.startsWith('[') && line.endsWith(']')) {
      if (current.lines.length) sections.push(current)
      current = { name: line.replace('[', '').replace(']', ''), lines: [] }
      pendingChord = null
      return
    }

    const looksLikeChord = line.split(/\s+/).some((token) => chordTokens.includes(token)) && line.length <= 90
    if (looksLikeChord) {
      pendingChord = line
    } else {
      current.lines.push({ chordLine: pendingChord, lyricLine: line })
      pendingChord = null
    }
  })

  if (current.lines.length) sections.push(current)
  return { sections: sections.length ? sections : [{ name: '正文', lines: [{ chordLine: null, lyricLine: rawText || '暂无内容' }] }] }
}

async function getCurrentUser(openid) {
  const result = await users.where({ openid }).limit(1).get()
  return result.data[0] || null
}

function paginate(items = [], page = 1, pageSize = 20) {
  const p = Number(page || 1)
  const size = Number(pageSize || 20)
  const start = Math.max(0, (p - 1) * size)
  return {
    total: items.length,
    page: p,
    page_size: size,
    items: items.slice(start, start + size),
  }
}

function buildSeedSongData(seed = {}, now = new Date()) {
  const title = String(seed.title || '').trim()
  const artistName = String(seed.artist_name || '').trim()
  const aliases = Array.isArray(seed.aliases) ? seed.aliases : []
  const data = {
    title,
    artist_name: artistName,
    style: seed.style || '弹唱',
    song_key: seed.song_key || 'C',
    bpm: seed.bpm || null,
    capo: seed.capo || '0品',
    difficulty: seed.difficulty || '新手',
    strumming: seed.strumming || '',
    tags: uniqueStrings(['热门', 'seed', 'AI可生成', ...(seed.tags || [])]),
    aliases,
    pinyin: seed.pinyin || '',
    initials: seed.initials || '',
    raw_text: '',
    content_json: {
      sections: [],
      chords: [],
      practiceTips: [],
      seedNotice: '热门歌曲种子数据，暂无完整曲谱，可 AI 生成简化弹唱编配版。',
    },
    source_type: 'seed',
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
  data.search_text = buildSearchText(data)
  return data
}

function mergeSongMaps(target, rows = [], keyword = '') {
  rows.forEach((row) => {
    if (!row?._id) return
    const existed = target.get(row._id)
    const normalized = normalizeSong({
      ...row,
      search_keywords: Array.isArray(row.search_keywords) ? row.search_keywords : buildSearchKeywords(row),
      search_text: row.search_text || buildSearchText(row),
    })
    const scored = { ...normalized, _search_score: scoreSong(normalized, keyword) }
    if (!existed || Number(scored._search_score || 0) > Number(existed._search_score || 0)) {
      target.set(row._id, scored)
    }
  })
}

async function safeGet(query) {
  try {
    const result = await query.limit(MAX_QUERY_LIMIT).get()
    return result.data || []
  } catch (error) {
    console.log('search query failed', error?.message || error)
    return []
  }
}

async function queryRegexField(field, value, base = {}) {
  if (!value) return []
  const regexp = escapeRegExp(value)
  if (!regexp) return []
  return safeGet(songs.where({
    ...base,
    [field]: db.RegExp({ regexp, options: 'i' }),
  }))
}

async function queryExactArrayField(field, values = [], base = {}) {
  const list = uniqueStrings(values).filter(Boolean).slice(0, 20)
  if (!list.length) return []
  return safeGet(songs.where({
    ...base,
    [field]: _.in(list),
  }))
}

async function fetchSearchCandidates(keyword = '', base = {}, sortField = 'created_at') {
  const variants = buildSearchVariants(keyword)
  const keywordMap = new Map()

  for (const variant of variants) {
    const compact = normalizeCompact(variant)
    const rows = await Promise.all([
      queryRegexField('title', variant, base),
      queryRegexField('artist_name', variant, base),
      queryRegexField('pinyin', variant, base),
      queryRegexField('initials', compact, base),
      queryRegexField('search_fingerprint', variant, base),
      queryRegexField('search_text', variant, base),
      queryExactArrayField('search_keywords', [variant, compact, `${variant} 吉他谱`, `${variant} 弹唱`, `${variant} 和弦谱`], base),
      queryExactArrayField('aliases', [variant, `${variant}吉他谱`, `${variant}弹唱`, `${variant}和弦谱`], base),
    ])
    rows.flat().forEach((row) => mergeSongMaps(keywordMap, [row], keyword))
    if (keywordMap.size >= 80) break
  }

  if (keywordMap.size < 8) {
    let skip = 0
    while (skip < MAX_SEARCH_SCAN && keywordMap.size < 120) {
      const result = await songs.where(base).orderBy(sortField, 'desc').skip(skip).limit(MAX_QUERY_LIMIT).get()
      const rows = result.data || []
      if (!rows.length) break
      mergeSongMaps(keywordMap, rows, keyword)
      skip += MAX_QUERY_LIMIT
    }
  }

  return Array.from(keywordMap.values())
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || 'debug-openid'
  const action = event.action || 'search'
  const now = new Date()

  if (action === 'seedImport') {
    const token = event.token || process.env.SEED_IMPORT_TOKEN || ''
    const expectedToken = process.env.SEED_IMPORT_TOKEN || ''
    if (expectedToken && token !== expectedToken) return { code: 403, message: '无权限导入种子曲库' }

    const dryRun = Boolean(event.dryRun)
    const limit = Math.min(Number(event.limit || seedSongs.length), seedSongs.length)
    const source = seedSongs.slice(0, limit).filter((item) => item.title && item.artist_name)
    let created = 0
    let updated = 0
    let skipped = 0
    const samples = []

    for (const seed of source) {
      const data = buildSeedSongData(seed, now)
      const existed = await songs.where({ title: data.title, artist_name: data.artist_name, source_type: 'seed' }).limit(1).get()
      samples.push(`${data.title}-${data.artist_name}`)
      if (dryRun) {
        skipped += 1
        continue
      }
      if (existed.data.length) {
        await songs.doc(existed.data[0]._id).update({
          data: {
            ...data,
            created_at: existed.data[0].created_at || now,
            updated_at: now,
          },
        })
        updated += 1
      } else {
        await songs.add({ data })
        created += 1
      }
    }

    return {
      code: 0,
      data: {
        dryRun,
        total: source.length,
        created,
        updated,
        skipped,
        samples: samples.slice(0, 10),
      },
    }
  }

  if (action === 'manualCreate') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }
    if (!event.title || !event.raw_text) return { code: 400, message: '歌名和曲谱内容不能为空' }

    const rawText = String(event.raw_text || '')
    const contentJson = parseRawTab(rawText)
    const data = {
      user_openid: openid,
      user_id: user._id,
      title: String(event.title).slice(0, 100),
      artist_name: event.artist_name || '',
      style: event.style || '弹唱',
      song_key: event.song_key || 'C',
      bpm: event.bpm || null,
      capo: event.capo || '0品',
      difficulty: event.difficulty || '新手',
      strumming: event.strumming || '',
      tags: Array.isArray(event.tags) ? event.tags : [],
      aliases: Array.isArray(event.aliases) ? event.aliases : [],
      pinyin: event.pinyin || '',
      initials: event.initials || '',
      raw_text: rawText,
      content_json: contentJson,
      source_type: 'user_upload',
      edit_mode: 'manual',
      has_tab: true,
      is_public: Boolean(event.is_public),
      visibility: event.is_public ? 'public' : 'private',
      audit_status: event.is_public ? 'pending' : 'private',
      favorite_count: 0,
      like_count: 0,
      comment_count: 0,
      view_count: 0,
      practice_count: 0,
      created_at: now,
      updated_at: now,
    }
    data.search_keywords = buildSearchKeywords(data)
    data.search_text = buildSearchText(data)
    data.search_fingerprint = normalizeText(`${data.title} ${data.artist_name}`)

    const result = await songs.add({ data })
    await users.doc(user._id).update({ data: { works_count: _.inc(1), updated_at: now } })

    return { code: 0, data: normalizeSong({ _id: result._id, ...data }) }
  }

  if (action === 'publish') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }
    if (!event.id) return { code: 400, message: 'id is required' }

    const detail = await songs.doc(event.id).get()
    if (!detail.data || detail.data.user_openid !== openid) return { code: 403, message: '无权限操作' }

    await songs.doc(event.id).update({
      data: {
        is_public: true,
        visibility: 'public',
        audit_status: 'pending',
        updated_at: now,
      },
    })

    return { code: 0, data: { published: true } }
  }

  if (action === 'detail') {
    if (!event.id) return { code: 400, message: 'id is required' }

    const result = await songs.doc(event.id).get()
    if (!result.data) return { code: 404, message: '曲谱不存在' }

    await songs.doc(event.id).update({ data: { view_count: _.inc(1), updated_at: now } })
    return { code: 0, data: normalizeSong({ ...result.data, view_count: Number(result.data.view_count || 0) + 1 }) }
  }

  if (action === 'mine') {
    const page = Number(event.page || 1)
    const pageSize = Math.min(50, Number(event.page_size || 20))
    const result = await songs.where({ user_openid: openid }).orderBy('created_at', 'desc').get()
    const normalized = result.data.map((item) => normalizeSong(item))
    return { code: 0, data: paginate(normalized, page, pageSize) }
  }

  if (action === 'remove') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }
    if (!event.id) return { code: 400, message: 'id is required' }

    const detail = await songs.doc(event.id).get()
    if (!detail.data || detail.data.user_openid !== openid) return { code: 403, message: '无权限删除' }

    await songs.doc(event.id).remove()
    await users.doc(user._id).update({ data: { works_count: _.inc(-1), updated_at: now } })
    return { code: 0, data: { removed: true } }
  }

  if (action === 'search') {
    const keyword = String(event.keyword || '').trim()
    const normalizedKeyword = normalizeText(keyword)
    const difficulty = String(event.difficulty || '').trim()
    const songKey = String(event.song_key || '').trim()
    const sourceType = String(event.source_type || '').trim()
    const page = Number(event.page || 1)
    const pageSize = Math.min(50, Number(event.page_size || 20))
    const sort = event.sort || 'created_at'
    const sortField = sort === 'likes' ? 'like_count' : sort === 'favorites' ? 'favorite_count' : sort === 'views' ? 'view_count' : 'created_at'

    const base = { is_public: true }
    if (difficulty) base.difficulty = difficulty
    if (sourceType) base.source_type = sourceType

    let items = []
    if (normalizedKeyword) {
      items = await fetchSearchCandidates(keyword, base, sortField)
        .then((rows) => rows
          .map((item) => ({ ...item, _search_score: scoreSong(item, keyword) }))
          .filter((item) => item._search_score > 0)
          .sort((a, b) => Number(b._search_score || 0) - Number(a._search_score || 0)))
    } else {
      const result = await songs.where(base).orderBy(sortField, 'desc').limit(MAX_QUERY_LIMIT).get()
      items = result.data.map((item) => normalizeSong({
        ...item,
        search_keywords: Array.isArray(item.search_keywords) ? item.search_keywords : buildSearchKeywords(item),
        search_text: item.search_text || buildSearchText(item),
      }))
    }

    if (songKey) {
      items = items.filter((item) => String(item.song_key || '').toLowerCase() === songKey.toLowerCase())
    }

    return { code: 0, data: paginate(items, page, pageSize) }
  }

  if (action === 'userSongs') {
    const userId = event.user_id
    if (!userId) return { code: 400, message: 'user_id is required' }

    const page = Number(event.page || 1)
    const pageSize = Math.min(50, Number(event.page_size || 20))
    const result = await songs
      .where({ user_id: userId, is_public: true })
      .orderBy('created_at', 'desc')
      .get()

    const items = result.data.map((item) => normalizeSong(item))
    return { code: 0, data: paginate(items, page, pageSize) }
  }

  if (action === 'userProfile') {
    const userId = event.user_id
    if (!userId) return { code: 400, message: 'user_id is required' }

    const userRes = await users.doc(userId).get()
    const profile = userRes.data
    if (!profile) return { code: 404, message: '用户不存在' }

    const worksCount = await songs.where({ user_id: userId }).count()
    const likesCount = await songs.where({ user_id: userId }).get().then((res) => res.data.reduce((sum, item) => sum + Number(item.like_count || 0), 0))
    const followersCount = await follows.where({ following_user_id: userId }).count()
    const followingCount = await follows.where({ follower_user_id: userId }).count()

    return {
      code: 0,
      data: {
        user: {
          id: profile._id,
          nickname: profile.nickname || '谱友',
          avatar_url: profile.avatar_url || '',
          membership_type: profile.membership_type || 'free',
          generation_quota: profile.generation_quota || 0,
          daily_free_quota: profile.daily_free_quota || 0,
          total_generated: profile.total_generated || 0,
          created_at: profile.created_at,
        },
        stats: {
          works_count: worksCount.total,
          likes_count: likesCount,
          followers_count: followersCount.total,
          following_count: followingCount.total,
        },
      },
    }
  }

  if (action === 'follow') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }

    const targetUserId = event.user_id
    if (!targetUserId || targetUserId === user._id) return { code: 400, message: '无效的用户 ID' }

    const exist = await follows.where({ follower_openid: openid, following_user_id: targetUserId }).limit(1).get()
    if (!exist.data.length) {
      await follows.add({
        data: {
          follower_openid: openid,
          follower_user_id: user._id,
          following_user_id: targetUserId,
          created_at: now,
        },
      })

      await users.doc(user._id).update({ data: { following_count: _.inc(1), updated_at: now } })
      await users.doc(targetUserId).update({ data: { followers_count: _.inc(1), updated_at: now } })
    }

    return { code: 0, data: { following: true } }
  }

  if (action === 'unfollow') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }

    const targetUserId = event.user_id
    if (!targetUserId) return { code: 400, message: 'user_id is required' }

    const exist = await follows.where({ follower_openid: openid, following_user_id: targetUserId }).limit(1).get()
    if (exist.data.length) {
      await follows.doc(exist.data[0]._id).remove()
      await users.doc(user._id).update({ data: { following_count: _.inc(-1), updated_at: now } })
      await users.doc(targetUserId).update({ data: { followers_count: _.inc(-1), updated_at: now } })
    }

    return { code: 0, data: { following: false } }
  }

  if (action === 'practiceCreate') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }
    if (!event.song_id) return { code: 400, message: 'song_id is required' }

    const recordData = {
      user_openid: openid,
      user_id: user._id,
      song_id: event.song_id,
      duration_seconds: Number(event.duration_seconds || 0),
      bpm: Number(event.bpm || 0),
      scroll_speed: Number(event.scroll_speed || 0),
      practiced_sections: event.practiced_sections || {},
      created_at: now,
      updated_at: now,
    }

    const result = await practiceRecords.add({ data: recordData })
    await songs.doc(event.song_id).update({ data: { practice_count: _.inc(1), updated_at: now } })

    return { code: 0, data: { _id: result._id, ...recordData } }
  }

  if (action === 'practiceRecent') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }

    const page = Number(event.page || 1)
    const pageSize = Math.min(50, Number(event.page_size || 20))

    const result = await practiceRecords
      .where({ user_openid: openid })
      .orderBy('created_at', 'desc')
      .get()

    return { code: 0, data: paginate(result.data, page, pageSize) }
  }

  return { code: 400, message: `Unknown action: ${action}` }
}
