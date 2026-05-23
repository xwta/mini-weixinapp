const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const orders = db.collection('orders')

const PRODUCTS = [
  {
    code: 'vip_month',
    name: '月度会员',
    product_type: 'vip',
    amount: 29,
    description: '适合持续创作用户',
    benefits: ['更多 AI 生成次数', '优先体验新功能'],
  },
  {
    code: 'vip_quarter',
    name: '季度会员',
    product_type: 'vip',
    amount: 79,
    description: '3 个月连续权益',
    benefits: ['生成额度更高', '练习模式增强'],
  },
  {
    code: 'vip_year',
    name: '年度会员',
    product_type: 'vip',
    amount: 299,
    description: '全年最优方案',
    benefits: ['全年高额度', '长期权益'],
  },
]

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
  const openid = cloud.getWXContext().OPENID || event.openid || "debug-openid"
  const action = event.action || 'products'
  const now = new Date()

  if (action === 'products') {
    return { code: 0, data: PRODUCTS }
  }

  if (action === 'create') {
    const productCode = String(event.product_code || '')
    const product = PRODUCTS.find((item) => item.code === productCode)
    if (!product) return { code: 400, message: '无效的套餐' }

    const orderNo = `PL${Date.now()}${Math.floor(Math.random() * 1000)}`
    const data = {
      order_no: orderNo,
      user_openid: openid,
      product_code: product.code,
      product_type: product.product_type,
      amount: product.amount,
      payment_status: 'pending',
      payment_method: 'wechat_pay_mock',
      created_at: now,
      updated_at: now,
    }

    const created = await orders.add({ data })
    return {
      code: 0,
      data: {
        order: {
          id: created._id,
          ...data,
        },
        payment_params: {
          mode: 'mock',
          order_no: orderNo,
        },
      },
    }
  }

  if (action === 'mine') {
    const page = Number(event.page || 1)
    const pageSize = Math.min(50, Number(event.page_size || 20))

    const result = await orders.where({ user_openid: openid }).orderBy('created_at', 'desc').get()
    const list = result.data.map((item) => ({
      id: item._id,
      ...item,
    }))

    return { code: 0, data: paginate(list, page, pageSize) }
  }

  return { code: 400, message: `Unknown action: ${action}` }
}
