const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const MAX_BYTES = 3 * 1024 * 1024
const TIMEOUT_MS = 4200
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const HTML_TYPES = ['text/html', 'application/xhtml+xml']

function jsonResponse(code, dataOrMessage) {
  if (code === 0) return { code, data: dataOrMessage }
  return { code, message: dataOrMessage }
}

function decodeHtml(text = '') {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, num) => String.fromCharCode(parseInt(num, 10)))
}

function stripHtml(text = '') {
  return decodeHtml(String(text || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeUrl(url = '') {
  try {
    let raw = decodeHtml(String(url || '').trim())
    if (!raw) return ''
    if (raw.startsWith('//')) raw = `https:${raw}`
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString()
  } catch (_error) {
    return ''
  }
}

function absoluteUrl(url = '', base = '') {
  try {
    const raw = decodeHtml(String(url || '').trim())
    if (!raw || raw.startsWith('data:')) return ''
    return new URL(raw, base).toString()
  } catch (_error) {
    return ''
  }
}

function inferImageType(buffer, contentType = '', url = '') {
  const type = String(contentType || '').split(';')[0].toLowerCase()
  if (ALLOWED_IMAGE_TYPES.includes(type)) return type === 'image/jpg' ? 'image/jpeg' : type
  if (buffer?.length >= 12) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif'
    if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  }
  const lowerUrl = String(url || '').toLowerCase()
  if (/\.(?:jpg|jpeg)(?:\?|$)/.test(lowerUrl)) return 'image/jpeg'
  if (/\.png(?:\?|$)/.test(lowerUrl)) return 'image/png'
  if (/\.webp(?:\?|$)/.test(lowerUrl)) return 'image/webp'
  if (/\.gif(?:\?|$)/.test(lowerUrl)) return 'image/gif'
  return type
}

function extFromType(contentType = '') {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'jpg'
}

function headers(url = '', accept = '*/*') {
  let referer = 'https://www.baidu.com/'
  try {
    const parsed = new URL(url)
    referer = `${parsed.protocol}//${parsed.hostname}/`
  } catch (_error) {}
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    Accept: accept,
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    Referer: referer,
  }
}

function requestRaw(url, accept = '*/*', maxBytes = MAX_BYTES) {
  return new Promise((resolve, reject) => {
    let settled = false
    let req = null
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
      if (req) req.destroy()
    }
    const fail = (error) => {
      if (settled) return
      settled = true
      reject(error)
      if (req) req.destroy(error)
    }
    try {
      const parsed = new URL(url)
      const transport = parsed.protocol === 'http:' ? require('http') : require('https')
      const chunks = []
      let total = 0
      req = transport.request({
        method: 'GET',
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        headers: headers(url, accept),
      }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume()
          const nextUrl = new URL(res.headers.location, url).toString()
          requestRaw(nextUrl, accept, maxBytes).then(finish).catch(fail)
          return
        }
        const contentType = String(res.headers['content-type'] || '').split(';')[0].toLowerCase()
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume()
          fail(new Error(`资源请求失败：${res.statusCode}`))
          return
        }
        res.on('data', (chunk) => {
          total += chunk.length
          if (total > maxBytes) {
            fail(new Error('资源过大，无法在小程序内预览'))
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => finish({ buffer: Buffer.concat(chunks), contentType }))
        res.on('error', fail)
      })
      req.setTimeout(TIMEOUT_MS, () => fail(new Error('资源拉取超时')))
      req.on('error', fail)
      req.end()
    } catch (error) {
      fail(error)
    }
  })
}

async function requestText(url) {
  const { buffer, contentType } = await requestRaw(url, 'text/html,application/xhtml+xml,application/json,*/*', 900 * 1024)
  return { text: buffer.toString('utf8'), contentType }
}

async function requestImage(url) {
  const { buffer, contentType } = await requestRaw(url, 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8', MAX_BYTES)
  const inferredType = inferImageType(buffer, contentType, url)
  if (!ALLOWED_IMAGE_TYPES.includes(inferredType)) {
    throw new Error('当前资源不是可预览图片')
  }
  return { buffer, contentType: inferredType, sourceUrl: url }
}

function normalizeSearchQuery(text = '') {
  return stripHtml(text)
    .replace(/百度图片[:：]?/g, ' ')
    .replace(/百度搜索[:：]?/g, ' ')
    .replace(/Bing搜索[:：]?/gi, ' ')
    .replace(/搜索入口|图片谱|网页谱|TXT谱/g, ' ')
    .replace(/打开百度继续检索|打开百度图片继续检索/g, ' ')
    .replace(/[《》【】\[\]（）()]/g, ' ')
    .replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ')
    .trim()
}

function inferSearchQuery(event = {}) {
  if (event.search_query) return normalizeSearchQuery(event.search_query)
  const fromTitle = normalizeSearchQuery(event.title || '')
  if (fromTitle) return fromTitle
  const url = safeUrl(event.url || '')
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return normalizeSearchQuery(parsed.searchParams.get('word') || parsed.searchParams.get('wd') || parsed.searchParams.get('q') || parsed.searchParams.get('queryWord') || '')
  } catch (_error) {
    return ''
  }
}

function scoreImageCandidate(item = {}, query = '') {
  const text = `${item.title || ''} ${item.url || ''} ${item.thumb || ''}`.toLowerCase()
  const compact = query.replace(/\s+/g, '').toLowerCase()
  const compactText = text.replace(/\s+/g, '')
  let score = 0
  if (/吉他谱|和弦谱|弹唱谱|六线谱|图片谱|gtp|tab|chord|c调|g调/.test(text)) score += 50
  if (compact && compactText.includes(compact)) score += 25
  if (/52cmajor|iloveguitar|jita|tan8|jitabang|17jita/.test(text)) score += 12
  if (/\.jpg|\.jpeg|\.png|\.webp/.test(text)) score += 8
  return score
}

async function findBaiduImage(searchQuery = '') {
  const query = normalizeSearchQuery(searchQuery)
  if (!query) throw new Error('缺少图片谱搜索词')
  const fullQuery = /吉他谱|和弦谱|弹唱谱|六线谱/.test(query) ? query : `${query} 吉他谱 高清图片谱`
  const encoded = encodeURIComponent(fullQuery)
  const url = `https://image.baidu.com/search/acjson?tn=resultjson_com&ipn=rj&word=${encoded}&queryWord=${encoded}&pn=0&rn=18&ie=utf-8&oe=utf-8`
  const { text } = await requestText(url)
  const data = JSON.parse(text || '{}')
  const candidates = (data.data || [])
    .map((item) => {
      const title = item.fromPageTitleEnc || item.fromPageTitle || item.title || fullQuery
      const thumb = safeUrl(item.thumbURL || item.thumbnailUrl || item.middleURL || item.objURL || '')
      const image = safeUrl(item.objURL || item.middleURL || item.hoverURL || thumb)
      const page = safeUrl(item.fromURL || item.fromUrl || image || thumb)
      return { title, thumb, image, page, score: scoreImageCandidate({ title, url: page, thumb }, query) }
    })
    .filter((item) => item.image || item.thumb)
    .sort((a, b) => b.score - a.score)

  const best = candidates[0]
  if (!best) throw new Error('没有找到可预览图片谱')
  return {
    imageUrl: best.image || best.thumb,
    sourceUrl: best.page || best.image || best.thumb,
    title: stripHtml(best.title || fullQuery).slice(0, 80),
  }
}

function extractImageUrlsFromHtml(html = '', pageUrl = '', query = '') {
  const results = []
  const imgRegex = /<img[^>]+>/gi
  let match
  while ((match = imgRegex.exec(html))) {
    const tag = match[0]
    const srcMatch = tag.match(/(?:src|data-src|data-original|data-url|data-lazy-src)=(['"])(.*?)\1/i)
    if (!srcMatch?.[2]) continue
    const src = absoluteUrl(srcMatch[2], pageUrl)
    if (!src) continue
    const altMatch = tag.match(/(?:alt|title)=(['"])(.*?)\1/i)
    const title = stripHtml(altMatch?.[2] || query || '吉他谱图片')
    const score = scoreImageCandidate({ title, url: src, thumb: src }, query)
    if (score < 20 && !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(src)) continue
    results.push({ imageUrl: src, sourceUrl: pageUrl, title, score })
  }
  return results.sort((a, b) => b.score - a.score)
}

async function resolveImageFromResource(event = {}) {
  const directImageUrl = safeUrl(event.image_url || event.thumbnail_url || '')
  if (directImageUrl) return { imageUrl: directImageUrl, sourceUrl: safeUrl(event.url || directImageUrl), title: event.title || '吉他谱图片' }

  const resourceUrl = safeUrl(event.url || '')
  const searchQuery = inferSearchQuery(event)
  if (!resourceUrl) return findBaiduImage(searchQuery)

  try {
    const parsed = new URL(resourceUrl)
    const isBaiduSearch = parsed.hostname.includes('baidu.com') && (/\/s$|\/search\//.test(parsed.pathname) || parsed.hostname.includes('image.baidu.com'))
    if (isBaiduSearch) return findBaiduImage(searchQuery)
  } catch (_error) {}

  try {
    const { text, contentType } = await requestText(resourceUrl)
    if (ALLOWED_IMAGE_TYPES.includes(contentType)) return { imageUrl: resourceUrl, sourceUrl: resourceUrl, title: event.title || '吉他谱图片' }
    if (!HTML_TYPES.includes(contentType) && !contentType.includes('text')) return findBaiduImage(searchQuery)
    const images = extractImageUrlsFromHtml(text, resourceUrl, searchQuery || event.title || '')
    if (images.length) return images[0]
    return findBaiduImage(searchQuery || event.title || '')
  } catch (_error) {
    return findBaiduImage(searchQuery || event.title || '')
  }
}

async function uploadPreviewImage({ imageUrl, sourceUrl, title }) {
  const { buffer, contentType } = await requestImage(imageUrl)
  const hash = crypto.createHash('sha1').update(`${imageUrl}|${buffer.length}`).digest('hex')
  const ext = extFromType(contentType)
  const cloudPath = `tab-previews/${hash}.${ext}`
  const uploaded = await cloud.uploadFile({ cloudPath, fileContent: buffer })
  const tempResult = await cloud.getTempFileURL({ fileList: [uploaded.fileID] })
  const tempURL = tempResult.fileList?.[0]?.tempFileURL || ''
  if (!tempURL) throw new Error('生成预览地址失败')
  return {
    title: String(title || '吉他谱图片').slice(0, 80),
    fileID: uploaded.fileID,
    tempFileURL: tempURL,
    contentType,
    size: buffer.length,
    sourceUrl: sourceUrl || imageUrl,
    imageUrl,
    notice: '图片仅用于小程序内临时预览，请保留原始来源信息。',
  }
}

exports.main = async (event = {}) => {
  try {
    const resolved = await resolveImageFromResource(event)
    if (!resolved?.imageUrl) return jsonResponse(400, '没有找到可预览图片谱')
    const uploaded = await uploadPreviewImage(resolved)
    return jsonResponse(0, uploaded)
  } catch (error) {
    console.error('resource-preview error:', error)
    return jsonResponse(500, error?.message || '资源预览失败')
  }
}