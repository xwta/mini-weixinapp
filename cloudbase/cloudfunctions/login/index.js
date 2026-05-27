const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const users = db.collection('users')

const DAILY_FREE_LIMIT = 5

function todayKey(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function buildNewUser(openid, event = {}, now = new Date()) {
  const date = todayKey(now)
  return {
    openid,
    nickname: event.nickname || '谱灵用户',
    avatar_url: event.avatar_url || '',
    membership_type: 'free',
    quota_policy: 'daily',
    daily_free_limit: DAILY_FREE_LIMIT,
    daily_free_quota: DAILY_FREE_LIMIT,
    daily_used_count: 0,
    quota_date: date,
    generation_quota: DAILY_FREE_LIMIT,
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
}

function buildExistingUserPatch(user = {}, now = new Date()) {
  const patch = {
    last_login_at: now,
    updated_at: now,
  }
  // 老用户统一迁移为不限次数，解决“当前用户没有免费额度”的历史数据问题。
  if (!user.quota_policy) {
    patch.quota_policy = 'unlimited'
    patch.generation_quota = -1
    patch.daily_free_quota = -1
    patch.daily_free_limit = -1
  }
  return patch
}

function mergeUserForReturn(user = {}, patch = {}) {
  return { ...user, ...patch }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || 'debug-openid'
  const now = new Date()

  const existed = await users.where({ openid }).limit(1).get()
  if (existed.data.length) {
    const user = existed.data[0]
    const patch = buildExistingUserPatch(user, now)
    await users.doc(user._id).update({ data: patch })
    return {
      code: 0,
      data: {
        token: openid,
        user: mergeUserForReturn(user, patch),
      },
    }
  }

  const userData = buildNewUser(openid, event, now)
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
