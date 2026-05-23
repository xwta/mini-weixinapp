const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const songs = db.collection('songs')

exports.main = async (event) => {
  const action = event.action || 'home'

  if (action === 'hot') {
    const result = await songs
      .where({ is_public: true })
      .orderBy('like_count', 'desc')
      .orderBy('view_count', 'desc')
      .limit(event.page_size || 10)
      .get()
    return { code: 0, data: result.data }
  }

  if (action === 'recommend') {
    const result = await songs
      .where({ is_public: true })
      .orderBy('practice_count', 'desc')
      .orderBy('created_at', 'desc')
      .limit(event.page_size || 10)
      .get()
    return { code: 0, data: result.data }
  }

  if (action === 'keywords') {
    return {
      code: 0,
      data: ['晴天', '成都', '周杰伦', '民谣', '新手弹唱', 'AI原创'],
    }
  }

  if (action === 'home') {
    const [hot, recommend] = await Promise.all([
      songs.where({ is_public: true }).orderBy('like_count', 'desc').limit(8).get(),
      songs.where({ is_public: true }).orderBy('created_at', 'desc').limit(8).get(),
    ])

    return {
      code: 0,
      data: {
        keywords: ['晴天', '成都', '周杰伦', '民谣', '新手弹唱', 'AI原创'],
        hot: hot.data,
        recommend: recommend.data,
      },
    }
  }

  return { code: 400, message: 'Unknown action' }
}
