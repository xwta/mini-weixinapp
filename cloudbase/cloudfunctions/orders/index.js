const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const FREE_FEATURES = [
  { code: 'ai_tab_search', name: 'AI搜谱', description: '输入歌名或歌手，查找曲谱资源。', benefits: ['搜谱', '生成TXT谱', '生成图片六线谱'] },
  { code: 'tuner', name: '调音器', description: '辅助吉他标准音调音练习。', benefits: ['麦克风识别', '标准音参考'] },
]

function emptyList(page = 1, pageSize = 20) {
  return {
    total: 0,
    page: Number(page || 1),
    page_size: Number(pageSize || 20),
    items: [],
  }
}

exports.main = async (event = {}) => {
  const action = event.action || 'products'

  if (action === 'products') {
    return { code: 0, data: FREE_FEATURES }
  }

  if (action === 'mine') {
    return { code: 0, data: emptyList(event.page, event.page_size) }
  }

  if (action === 'create') {
    return { code: 403, message: '当前版本仅开放免费工具体验' }
  }

  return { code: 400, message: `Unknown action: ${action}` }
}
