const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const notifications = db.collection('notifications')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || "debug-openid"
  const action = event.action || 'list'
  const now = new Date()

  if (action === 'list') {
    const result = await notifications
      .where({ user_openid: openid })
      .orderBy('created_at', 'desc')
      .limit(event.page_size || 50)
      .get()

    return { code: 0, data: { items: result.data, total: result.data.length } }
  }

  if (action === 'unreadCount') {
    const result = await notifications.where({ user_openid: openid, is_read: false }).count()
    return { code: 0, data: { count: result.total } }
  }

  if (action === 'read') {
    if (!event.id) return { code: 400, message: 'id is required' }
    await notifications.doc(event.id).update({ data: { is_read: true, updated_at: now } })
    return { code: 0, data: { read: true } }
  }

  if (action === 'readAll') {
    const list = await notifications.where({ user_openid: openid, is_read: false }).limit(100).get()
    await Promise.all(list.data.map((item) => notifications.doc(item._id).update({ data: { is_read: true, updated_at: now } })))
    return { code: 0, data: { read_all: true, count: list.data.length } }
  }

  if (action === 'create') {
    if (!event.user_openid || !event.title) return { code: 400, message: '参数不完整' }
    const data = {
      user_openid: event.user_openid,
      type: event.type || 'system',
      title: event.title,
      content: event.content || '',
      target_id: event.target_id || '',
      is_read: false,
      created_at: now,
      updated_at: now,
    }
    const result = await notifications.add({ data })
    return { code: 0, data: { _id: result._id, ...data } }
  }

  return { code: 400, message: 'Unknown action' }
}
