const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const songs = db.collection('songs')
const userProfiles = db.collection('user_profiles')
const userActions = db.collection('user_actions')
const recommendationLogs = db.collection('recommendation_logs')

const KEYWORDS = ['晴天', '成都', '周杰伦', '民谣', '新手弹唱', 'AI原创']

function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function normalizeCount(value, max = 100) {
  return Math.min(1, Math.log10(toNumber(value) + 1) / Math.log10(max + 1))
}

function getCreatedTime(song) {
  const raw = song.created_at || song.createdAt || song.updated_at || song.updatedAt
  if (!raw) return Date.now()
  if (raw instanceof Date) return raw.getTime()
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') return new Date(raw).getTime() || Date.now()
  if (raw?.toDate) return raw.toDate().getTime()
  return Date.now()
}

function calcFreshness(song) {
  const ageHours = Math.max(1, (Date.now() - getCreatedTime(song)) / 36e5)
  return Math.max(0, Math.min(1, 1 / Math.pow(ageHours / 24 + 1, 0.6)))
}

function collectSongTags(song) {
  return [
    song.style,
    song.song_key,
    song.difficulty,
    song.artist_name,
    ...(Array.isArray(song.tags) ? song.tags : []),
    ...(Array.isArray(song.chords) ? song.chords : []),
  ]
    .filter(Boolean)
    .map((item) => String(item).trim().toLowerCase())
}

function calcInterestScore(song, profile = {}) {
  const songTags = new Set(collectSongTags(song))
  const interests = [
    ...(profile.interest_tags || []),
    ...(profile.favorite_artists || []),
    ...(profile.preferred_keys || []),
  ]
    .filter(Boolean)
    .map((item) => String(item).trim().toLowerCase())

  if (!interests.length || !songTags.size) return 0

  const hitCount = interests.filter((tag) => songTags.has(tag)).length
  return Math.min(1, hitCount / Math.max(1, Math.min(interests.length, 5)))
}

function calcSkillScore(song, profile = {}) {
  const userLevel = String(profile.skill_level || '').toLowerCase()
  const difficulty = String(song.difficulty || '').toLowerCase()

  if (!userLevel || !difficulty) return 0.5
  if (difficulty.includes(userLevel)) return 1
  if (userLevel.includes('beginner') && /新手|简单|beginner/.test(difficulty)) return 1
  if (userLevel.includes('intermediate') && /中级|intermediate/.test(difficulty)) return 1
  return 0.55
}

function scoreSong(song, profile = {}) {
  const favoriteScore = normalizeCount(song.favorite_count, 80)
  const likeScore = normalizeCount(song.like_count, 120)
  const practiceScore = normalizeCount(song.practice_count, 60)
  const freshnessScore = calcFreshness(song)
  const interestScore = calcInterestScore(song, profile)
  const skillScore = calcSkillScore(song, profile)

  const score =
    favoriteScore * 0.3 +
    likeScore * 0.22 +
    practiceScore * 0.18 +
    freshnessScore * 0.1 +
    interestScore * 0.14 +
    skillScore * 0.06

  const reasons = []
  if (interestScore > 0) reasons.push('匹配你的音乐偏好')
  if (skillScore >= 0.9) reasons.push('适合你的当前水平')
  if (favoriteScore > 0.45) reasons.push('收藏热度高')
  if (likeScore > 0.45) reasons.push('最近点赞多')
  if (practiceScore > 0.35) reasons.push('很多人正在练')
  if (freshnessScore > 0.65) reasons.push('近期上升曲谱')
  if (!reasons.length) reasons.push('综合表现稳定')

  return {
    ...song,
    recommendation_score: Number(score.toFixed(4)),
    recommendation_reason: reasons.slice(0, 2).join(' · '),
    recommendation_factors: {
      favoriteScore: Number(favoriteScore.toFixed(3)),
      likeScore: Number(likeScore.toFixed(3)),
      practiceScore: Number(practiceScore.toFixed(3)),
      freshnessScore: Number(freshnessScore.toFixed(3)),
      interestScore: Number(interestScore.toFixed(3)),
      skillScore: Number(skillScore.toFixed(3)),
    },
  }
}

async function getProfile(openid, userId) {
  const conditions = []
  if (userId) conditions.push({ user_id: userId })
  if (openid) conditions.push({ openid })
  if (!conditions.length) return null

  try {
    const result = await userProfiles.where(_.or(conditions)).limit(1).get()
    return result.data[0] || null
  } catch (error) {
    console.warn('user profile skipped:', error?.message || error)
    return null
  }
}

async function inferProfileFromActions(openid) {
  if (!openid) return {}
  try {
    const result = await userActions
      .where({ openid })
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()

    const tags = result.data
      .map((item) => item.keyword || item.tag || item.artist || item.target_title)
      .filter(Boolean)
      .slice(0, 8)

    return tags.length ? { interest_tags: tags } : {}
  } catch (error) {
    return {}
  }
}

async function logRecommendation(openid, items = [], scene = 'recommend') {
  try {
    await recommendationLogs.add({
      data: {
        openid,
        scene,
        item_ids: items.map((item) => item._id).filter(Boolean),
        scores: items.map((item) => ({ id: item._id, score: item.recommendation_score })),
        created_at: new Date(),
      },
    })
  } catch (error) {
    console.warn('recommendation log skipped:', error?.message || error)
  }
}

async function getCandidateSongs(limit = 60) {
  const result = await songs
    .where({ is_public: true })
    .orderBy('updated_at', 'desc')
    .limit(limit)
    .get()
  return result.data
}

async function recommendSongs(event, wxContext) {
  const openid = wxContext.OPENID || event.openid || ''
  const limit = event.limit || event.page_size || 10
  const profile =
    (await getProfile(openid, event.user_id)) ||
    (await inferProfileFromActions(openid)) ||
    {}

  const candidates = await getCandidateSongs(Math.max(40, limit * 5))
  const ranked = candidates
    .map((song) => scoreSong(song, profile))
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, limit)

  await logRecommendation(openid, ranked, event.scene || 'recommend')

  return ranked
}

exports.main = async (event = {}) => {
  const action = event.action || 'home'
  const wxContext = cloud.getWXContext()

  if (action === 'hot') {
    const result = await songs
      .where({ is_public: true })
      .orderBy('like_count', 'desc')
      .orderBy('view_count', 'desc')
      .limit(event.page_size || event.limit || 10)
      .get()
    return { code: 0, data: result.data }
  }

  if (action === 'recommend') {
    const data = await recommendSongs(event, wxContext)
    return { code: 0, data }
  }

  if (action === 'keywords') {
    return { code: 0, data: KEYWORDS }
  }

  if (action === 'home') {
    const [hot, recommend] = await Promise.all([
      songs.where({ is_public: true }).orderBy('like_count', 'desc').limit(8).get(),
      recommendSongs({ ...event, limit: 8, scene: 'home' }, wxContext),
    ])

    return {
      code: 0,
      data: {
        keywords: KEYWORDS,
        hot: hot.data,
        recommend,
      },
    }
  }

  return { code: 400, message: 'Unknown action' }
}
