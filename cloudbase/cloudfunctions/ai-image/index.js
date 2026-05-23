const tcb = require('@cloudbase/node-sdk')

function resolveEnvId() {
  return process.env.TCB_ENV || process.env.CLOUDBASE_ENV_ID || process.env.SCF_NAMESPACE || undefined
}

function findImageUrl(payload) {
  if (!payload) return ''
  if (typeof payload === 'string') {
    if (payload.startsWith('http')) return payload
    return ''
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const url = findImageUrl(item)
      if (url) return url
    }
    return ''
  }
  if (typeof payload === 'object') {
    const direct = payload.url || payload.imageUrl || payload.image_url
    if (typeof direct === 'string' && direct.startsWith('http')) return direct
    for (const key of Object.keys(payload)) {
      const url = findImageUrl(payload[key])
      if (url) return url
    }
  }
  return ''
}

exports.main = async (event = {}) => {
  const prompt = String(event.prompt || '').trim()
  if (!prompt) return { code: 400, message: 'prompt 不能为空' }

  try {
    const envId = resolveEnvId()
    const app = envId ? tcb.init({ env: envId }) : tcb.init()

    const model = app.ai().createImageModel('hunyuan-image')
    const result = await model.generateImage({
      model: event.model || 'hunyuan-image-v3.0-v1.0.4',
      prompt,
    })

    const imageUrl = findImageUrl(result)
    if (!imageUrl) {
      return { code: 500, message: '生图成功但未获取到图片地址', data: result }
    }

    return {
      code: 0,
      data: {
        imageUrl,
        raw: result,
      },
    }
  } catch (error) {
    console.error('ai-image error:', error)
    return { code: 500, message: error?.message || '生图失败，请稍后重试' }
  }
}
