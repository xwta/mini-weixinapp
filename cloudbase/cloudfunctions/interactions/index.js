const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const likes = db.collection('likes')
const favorites = db.collection('favorites')
const songs = db.collection('songs')

function normalizeSong(item = {}) {
  return {
    ...item,
    id: item.id || item._id,
    favorite_count: Number(item.favorite_count || 0),
    like_count: Number(item.like_count || 0),
    view_count: Number(item.view_count || 0),
  }
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

async function updateSongCounter(songId, field, delta, now) {
  try {
    await songs.doc(songId).update({ data: { [field]: _.inc(delta), updated_at: now } })
  } catch (error) {
    console.error(`update ${field} failed`, songId, error)
  }
}

async function ensureLike(openid, songId, now) {
  const exist = await likes.where({ user_openid: openid, song_id: songId }).limit(1).get()
  if (exist.data.length) {
    return { liked: true, changed: false }
  }

  await likes.add({ data: { user_openid: openid, song_id: songId, created_at: now } })
  await updateSongCounter(songId, 'like_count', 1, now)
  const detail = await songs.doc(songId).get()
  return { liked: true, changed: true, like_count: Number(detail?.data?.like_count || 0) }
}

async function removeLike(openid, songId, now) {
  const exist = await likes.where({ user_openid: openid, song_id: songId }).limit(1).get()
  if (!exist.data.length) {
    const detail = await songs.doc(songId).get()
    return { liked: false, changed: false, like_count: Number(detail?.data?.like_count || 0) }
  }

  await likes.doc(exist.data[0]._id).remove()
  await updateSongCounter(songId, 'like_count', -1, now)
  const detail = await songs.doc(songId).get()
  return { liked: false, changed: true, like_count: Number(detail?.data?.like_count || 0) }
}

async function ensureFavorite(openid, songId, now) {
  const exist = await favorites.where({ user_openid: openid, song_id: songId }).limit(1).get()
  if (exist.data.length) {
    return { favorited: true, changed: false }
  }

  await favorites.add({ data: { user_openid: openid, song_id: songId, created_at: now } })
  await updateSongCounter(songId, 'favorite_count', 1, now)
  return { favorited: true, changed: true }
}

async function removeFavorite(openid, songId, now) {
  const exist = await favorites.where({ user_openid: openid, song_id: songId }).limit(1).get()
  if (!exist.data.length) {
    return { favorited: false, changed: false }
  }

  await favorites.doc(exist.data[0]._id).remove()
  await updateSongCounter(songId, 'favorite_count', -1, now)
  return { favorited: false, changed: true }
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID || event.openid || "debug-openid"
  const action = event.action
  const now = new Date()

  if (action === 'toggleLike') {
    const songId = event.song_id
    if (!songId) return { code: 400, message: 'song_id required' }

    const exist = await likes.where({ user_openid: openid, song_id: songId }).limit(1).get()
    if (exist.data.length) {
      const res = await removeLike(openid, songId, now)
      return { code: 0, data: { liked: false, like_count: res.like_count } }
    }

    const res = await ensureLike(openid, songId, now)
    return { code: 0, data: { liked: true, like_count: res.like_count } }
  }

  if (action === 'toggleFavorite') {
    const songId = event.song_id
    if (!songId) return { code: 400, message: 'song_id required' }

    const exist = await favorites.where({ user_openid: openid, song_id: songId }).limit(1).get()
    if (exist.data.length) {
      await removeFavorite(openid, songId, now)
      return { code: 0, data: { favorited: false } }
    }

    await ensureFavorite(openid, songId, now)
    return { code: 0, data: { favorited: true } }
  }

  if (action === 'likeSong') {
    const songId = event.song_id
    if (!songId) return { code: 400, message: 'song_id required' }

    const res = await ensureLike(openid, songId, now)
    const detail = await songs.doc(songId).get()
    return { code: 0, data: { liked: true, like_count: Number(detail?.data?.like_count || res.like_count || 0) } }
  }

  if (action === 'unlikeSong') {
    const songId = event.song_id
    if (!songId) return { code: 400, message: 'song_id required' }

    const res = await removeLike(openid, songId, now)
    return { code: 0, data: { liked: false, like_count: Number(res.like_count || 0) } }
  }

  if (action === 'addFavorite') {
    const songId = event.song_id
    if (!songId) return { code: 400, message: 'song_id required' }

    await ensureFavorite(openid, songId, now)
    return { code: 0, data: { favorited: true } }
  }

  if (action === 'removeFavorite') {
    const songId = event.song_id
    if (!songId) return { code: 400, message: 'song_id required' }

    await removeFavorite(openid, songId, now)
    return { code: 0, data: { favorited: false } }
  }

  if (action === 'listFavorites') {
    const page = Number(event.page || 1)
    const pageSize = Math.min(50, Number(event.page_size || 20))

    const favoriteRows = await favorites.where({ user_openid: openid }).orderBy('created_at', 'desc').get()
    const songIds = favoriteRows.data.map((item) => item.song_id).filter(Boolean)
    if (!songIds.length) return { code: 0, data: { total: 0, page, page_size: pageSize, items: [] } }

    const songRows = await Promise.all(songIds.map((songId) => songs.doc(songId).get().catch(() => ({ data: null }))))
    const items = songRows.map((row) => row.data).filter(Boolean).map((item) => normalizeSong(item))

    return { code: 0, data: paginate(items, page, pageSize) }
  }

  if (action === 'listLiked') {
    const page = Number(event.page || 1)
    const pageSize = Math.min(50, Number(event.page_size || 20))

    const likedRows = await likes.where({ user_openid: openid }).orderBy('created_at', 'desc').get()
    const songIds = likedRows.data.map((item) => item.song_id).filter(Boolean)
    if (!songIds.length) return { code: 0, data: { total: 0, page, page_size: pageSize, items: [] } }

    const songRows = await Promise.all(songIds.map((songId) => songs.doc(songId).get().catch(() => ({ data: null }))))
    const items = songRows.map((row) => row.data).filter(Boolean).map((item) => normalizeSong(item))

    return { code: 0, data: paginate(items, page, pageSize) }
  }

  return { code: 400, message: `Unknown action: ${action}` }
}
