const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const songs = db.collection('songs')

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
  return { sections: sections.length ? sections : [{ name: '正文', lines: [{ chordLine: null, lyricLine: rawText }] }] }
}

async function getCurrentUser(openid) {
  const result = await db.collection('users').where({ openid }).limit(1).get()
  return result.data[0] || null
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action || 'search'
  const now = new Date()

  if (action === 'manualCreate') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }

    const rawText = event.raw_text || ''
    const contentJson = parseRawTab(rawText)
    const data = {
      user_openid: openid,
      user_id: user._id,
      title: event.title,
      artist_name: event.artist_name || '',
      style: event.style || '弹唱',
      song_key: event.song_key || 'C',
      bpm: event.bpm || null,
      capo: event.capo || '0品',
      difficulty: event.difficulty || '新手',
      strumming: event.strumming || '',
      tags: event.tags || [],
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
    await db.collection('users').doc(user._id).update({ data: { works_count: _.inc(1), updated_at: now } })
    return { code: 0, data: { _id: result._id, ...data } }
  }

  if (action === 'detail') {
    const id = event.id
    const result = await songs.doc(id).get()
    await songs.doc(id).update({ data: { view_count: _.inc(1), updated_at: now } })
    return { code: 0, data: result.data }
  }

  if (action === 'mine') {
    const result = await songs.where({ user_openid: openid }).orderBy('created_at', 'desc').limit(event.page_size || 20).get()
    return { code: 0, data: { items: result.data, total: result.data.length } }
  }

  if (action === 'search') {
    const keyword = event.keyword || ''
    let query = songs.where({ is_public: true })
    if (keyword) {
      query = songs.where(_.or([
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { artist_name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { style: db.RegExp({ regexp: keyword, options: 'i' }) },
      ]).and([{ is_public: true }]))
    }
    const result = await query.orderBy(event.sort || 'created_at', 'desc').limit(event.page_size || 20).get()
    return { code: 0, data: { items: result.data, total: result.data.length } }
  }

  return { code: 400, message: 'Unknown action' }
}
