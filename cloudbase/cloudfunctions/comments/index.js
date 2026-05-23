const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const comments = db.collection('comments')
const songs = db.collection('songs')
const users = db.collection('users')

async function getCurrentUser(openid) {
  const result = await users.where({ openid }).limit(1).get()
  return result.data[0] || null
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action || 'list'
  const now = new Date()

  if (action === 'list') {
    const songId = event.song_id
    if (!songId) return { code: 400, message: 'song_id is required' }

    const result = await comments
      .where({ song_id: songId, status: 'visible' })
      .orderBy('created_at', 'desc')
      .limit(event.page_size || 50)
      .get()

    return { code: 0, data: { items: result.data, total: result.data.length } }
  }

  if (action === 'create') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }
    if (!event.song_id || !event.content) return { code: 400, message: '参数不完整' }

    const data = {
      song_id: event.song_id,
      user_openid: openid,
      user_id: user._id,
      nickname: user.nickname || '谱灵用户',
      avatar_url: user.avatar_url || '',
      parent_id: event.parent_id || null,
      content: String(event.content).slice(0, 500),
      like_count: 0,
      status: 'visible',
      created_at: now,
      updated_at: now,
    }

    const result = await comments.add({ data })
    await songs.doc(event.song_id).update({ data: { comment_count: _.inc(1), updated_at: now } })

    return { code: 0, data: { _id: result._id, ...data } }
  }

  if (action === 'remove') {
    const user = await getCurrentUser(openid)
    if (!user) return { code: 401, message: '请先登录' }
    if (!event.id) return { code: 400, message: 'id is required' }

    const detail = await comments.doc(event.id).get()
    if (!detail.data || detail.data.user_openid !== openid) return { code: 403, message: '无权限删除' }

    await comments.doc(event.id).update({ data: { status: 'deleted', updated_at: now } })
    if (detail.data.song_id) {
      await songs.doc(detail.data.song_id).update({ data: { comment_count: _.inc(-1), updated_at: now } })
    }

    return { code: 0, data: { removed: true } }
  }

  return { code: 400, message: 'Unknown action' }
}
