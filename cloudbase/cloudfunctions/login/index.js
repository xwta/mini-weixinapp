const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const users = db.collection('users')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const now = new Date()

  const existed = await users.where({ openid }).limit(1).get()
  if (existed.data.length) {
    const user = existed.data[0]
    await users.doc(user._id).update({
      data: {
        last_login_at: now,
        updated_at: now,
      },
    })
    return {
      code: 0,
      data: {
        token: openid,
        user,
      },
    }
  }

  const userData = {
    openid,
    nickname: event.nickname || '谱灵用户',
    avatar_url: event.avatar_url || '',
    membership_type: 'free',
    generation_quota: 10,
    daily_free_quota: 5,
    total_generated: 0,
    works_count: 0,
    followers_count: 0,
    following_count: 0,
    likes_count: 0,
    status: 'active',
    created_at: now,
    updated_at: now,
    last_login_at: now,
  }

  const result = await users.add({ data: userData })
  return {
    code: 0,
    data: {
      token: openid,
      user: {
        _id: result._id,
        ...userData,
      },
    },
  }
}
