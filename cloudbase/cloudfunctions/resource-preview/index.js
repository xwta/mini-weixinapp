const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const MAX_BYTES = 3 * 1024 * 1024
const TIMEOUT_MS = 4500
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function jsonResponse(code, dataOrMessage) {
  if (code === 0) return { code, data: dataOrMessage }
  return { code, message: dataOrMessage }
}

function safeUrl(url = '') {
  try {
    const parsed = new URL(String(url || '').trim())
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString()
  } catch (_error) {
    return ''
  }
}

function extFromType(contentType = '') {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'jpg'
}

function requestBuffer(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === 'http:' ? require('http') : require('https')
    const chunks = []
    let total = 0
    const req = transport.request({
      method: 'GET',
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': `${parsed.protocol}//${parsed.hostname}/`,
      },
    }, (res) => {
      const type = String(res.headers['content-type'] || '').split(';')[0].toLowerCase()
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume()
        reject(new Error(`资源请求失败：${res.statusCode}`))
        return
      }
      if (!ALLOWED_IMAGE_TYPES.includes(type)) {
        res.resume()
        reject(new Error('当前资源不是可预览图片'))
        return
      }
      res.on('data', (chunk) => {
        total += chunk.length
        if (total > MAX_BYTES) {
          req.destroy(new Error('图片过大，无法在小程序内预览'))
          return
        }
        chunks.push(chunk)
      })
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: type }))
    })
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('资源拉取超时')))
    req.on('error', reject)
    req.end()
  })
}

exports.main = async (event = {}) => {
  const imageUrl = safeUrl(event.image_url || event.thumbnail_url || event.url || '')
  const title = String(event.title || '吉他谱图片').slice(0, 80)
  if (!imageUrl) return jsonResponse(400, '资源链接为空')

  try {
    const { buffer, contentType } = await requestBuffer(imageUrl)
    const hash = crypto.createHash('sha1').update(imageUrl).digest('hex')
    const ext = extFromType(contentType)
    const cloudPath = `tab-previews/${hash}.${ext}`
    const uploaded = await cloud.uploadFile({ cloudPath, fileContent: buffer })
    const tempResult = await cloud.getTempFileURL({ fileList: [uploaded.fileID] })
    const tempURL = tempResult.fileList?.[0]?.tempFileURL || ''

    if (!tempURL) return jsonResponse(500, '生成预览地址失败')

    return jsonResponse(0, {
      title,
      fileID: uploaded.fileID,
      tempFileURL: tempURL,
      contentType,
      size: buffer.length,
      sourceUrl: imageUrl,
      notice: '图片仅用于小程序内临时预览，请保留原始来源信息。',
    })
  } catch (error) {
    console.error('resource-preview error:', error)
    return jsonResponse(500, error?.message || '资源预览失败')
  }
}
