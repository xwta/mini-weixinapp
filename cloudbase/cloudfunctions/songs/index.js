const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const songs = db.collection('songs')
const users = db.collection('users')
const follows = db.collection('follows')
const practiceRecords = db.collection('practice_records')

function toSongId(item = {}) {
  return item.id || item._id
}

function normalizeSong(item = {}) {
  return {
    ...item,
    id: toSongId(item),
    favorite_count: Number(item.favorite_count || 0),
    like_count: Number(item.like_count || 0),
    view_count: Number(item.view_count || 0),
    comment_count: Number(item.comment_count || 0),
    practice_count: Number(item.practice_count || 0),
  }
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

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || "debug-openid"
  const action = event.action || 'search'
  const now = new Date()

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
      raw_text: rawText,
      content_json: contentJson,
      source_type: 'user_upload',
      edit_mode: 'manual',
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
    const keyword = String(event.keyword || '').trim().toLowerCase()
    const difficulty = String(event.difficulty || '').trim()
    const page = Number(event.page || 1)
    const pageSize = Math.min(50, Number(event.page_size || 20))
    const sort = event.sort || 'created_at'
    const sortField = sort === 'likes' ? 'like_count' : sort === 'favorites' ? 'favorite_count' : sort === 'views' ? 'view_count' : 'created_at'

    let query = songs.where({ is_public: true })
    if (difficulty) query = songs.where({ is_public: true, difficulty })

    const result = await query.orderBy(sortField, 'desc').get()
    let items = result.data.map((item) => normalizeSong(item))

    if (keyword) {
      items = items.filter((item) => {
        const haystack = [item.title, item.artist_name, item.style, item.song_key]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(keyword)
      })
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
