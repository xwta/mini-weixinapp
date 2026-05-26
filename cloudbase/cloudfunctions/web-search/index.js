const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const cacheCollection = db.collection('web_search_cache')

const REQUEST_TIMEOUT_MS = 4200
const MAX_REFERENCES = 14
const CACHE_TTL_MS = 12 * 60 * 60 * 1000
const CACHE_VERSION = 'v5-multi-provider'
const USER_AGENT = process.env.WEB_SEARCH_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const memoryCache = new Map()

const KNOWN_ARTISTS = {
  '晴天': '周杰伦', '七里香': '周杰伦', '稻香': '周杰伦', '告白气球': '周杰伦', '青花瓷': '周杰伦', '简单爱': '周杰伦',
  '成都': '赵雷', '南方姑娘': '赵雷', '平凡之路': '朴树', '蓝莲花': '许巍', '曾经的你': '许巍',
  '夜空中最亮的星': '逃跑计划', '海阔天空': 'Beyond', '光辉岁月': 'Beyond', '真的爱你': 'Beyond', '喜欢你': 'Beyond',
  '十年': '陈奕迅', '好久不见': '陈奕迅', '富士山下': '陈奕迅', '江南': '林俊杰', '她说': '林俊杰',
  '演员': '薛之谦', '认真的雪': '薛之谦', '消愁': '毛不易', '像我这样的人': '毛不易',
  '董小姐': '宋冬野', '安和桥': '宋冬野', '起风了': '买辣椒也用券', '后来': '刘若英', '小幸运': '田馥甄',
  '遇见': '孙燕姿', '红豆': '王菲', '同桌的你': '老狼', '贝加尔湖畔': '李健', '童话': '光良',
}

const TRUSTED_TAB_DOMAINS = [
  '52cmajor.com', 'iloveguitar.cn', 'jita5.com', 'jitabang.com', '17jita.com', 'qupu123.com',
  'jitatang.com', 'jita123.com', 'cangqiang.com', 'tan8.com', 'ultimate-guitar.com', 'e-chords.com', 'chordify.net',
]

const SEARCH_HOSTS = ['baidu.com', 'm.baidu.com', 'image.baidu.com', 'bing.com', 'duckduckgo.com', 'sogou.com']
const BLOCKED_RESOURCE_RE = /(?:视频|教学|下载|网盘|app|破解|付费|登录|论坛|社区|问答|伴奏|mp3|mp4|教程|课程)/i
const TAB_WORD_RE = /吉他谱|和弦谱|弹唱谱|六线谱|图片谱|文本谱|变调夹|原调|选调|capo|chord|tab|guitar/i
const IMPORT_WORD_RE = /吉他谱|和弦谱|弹唱谱|六线谱|文本谱|txt|变调夹|原调|选调|capo|chord|tab/i
const IMAGE_WORD_RE = /图片谱|高清|image|jpg|png|webp|jpeg/i

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
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, num) => String.fromCharCode(parseInt(num, 10)))
}

function stripHtml(text = '') {
  return decodeHtml(String(text || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeKeyword(keyword = '') {
  return String(keyword || '')
    .replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|歌词|歌曲|简谱|完整版|原版|简单版|教学|指弹|尤克里里|六线谱|gtp|guitar\s*(?:tab|chords?)?|chords?|tabs?/gi, ' ')
    .replace(/[《》【】\[\]（）()]/g, ' ')
    .replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ')
    .trim()
}

function safeUrl(url = '') {
  try {
    let raw = decodeHtml(String(url || '').trim())
    if (!raw) return ''
    if (raw.startsWith('//')) raw = `https:${raw}`
    if (raw.startsWith('/l/?') || raw.includes('duckduckgo.com/l/?')) {
      const full = raw.startsWith('http') ? raw : `https://duckduckgo.com${raw}`
      const parsedDuck = new URL(full)
      const uddg = parsedDuck.searchParams.get('uddg')
      if (uddg) raw = decodeURIComponent(uddg)
    }
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString()
  } catch (_error) {
    return ''
  }
}

function parseHost(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch (_error) {
    return ''
  }
}

function isTrustedHost(url = '') {
  const host = parseHost(url)
  return TRUSTED_TAB_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function isSearchHost(url = '') {
  const host = parseHost(url)
  return SEARCH_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function stableKey(text = '') {
  return normalizeKeyword(text).replace(/\s+/g, '').toLowerCase()
}

function getMemoryCache(key) {
  const cached = memoryCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    memoryCache.delete(key)
    return null
  }
  return cached.value
}

function setMemoryCache(key, value) {
  memoryCache.set(key, { value, createdAt: Date.now() })
  if (memoryCache.size > 180) {
    const firstKey = memoryCache.keys().next().value
    if (firstKey) memoryCache.delete(firstKey)
  }
}

async function getPersistentCache(cacheKey) {
  try {
    const result = await cacheCollection.where({ cache_key: cacheKey }).limit(1).get()
    const row = result.data?.[0]
    if (!row || !row.created_at) return null
    if (Date.now() - new Date(row.created_at).getTime() > CACHE_TTL_MS) return null
    return row.payload || null
  } catch (_error) {
    return null
  }
}

async function setPersistentCache(cacheKey, payload) {
  try {
    const now = new Date()
    const existed = await cacheCollection.where({ cache_key: cacheKey }).limit(1).get()
    if (existed.data?.[0]?._id) {
      await cacheCollection.doc(existed.data[0]._id).update({ data: { payload, updated_at: now, created_at: existed.data[0].created_at || now } })
    } else {
      await cacheCollection.add({ data: { cache_key: cacheKey, payload, created_at: now, updated_at: now } })
    }
  } catch (_error) {}
}

function headers(extra = {}) {
  return {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    ...extra,
  }
}

function requestRaw(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === 'http:' ? require('http') : require('https')
    const req = transport.request({ method: 'GET', hostname: parsed.hostname, path: `${parsed.pathname}${parsed.search}`, headers: options.headers || headers() }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume()
        const nextUrl = new URL(res.headers.location, url).toString()
        requestRaw(nextUrl, options).then(resolve).catch(reject)
        return
      }
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        raw += chunk
        if (raw.length > (options.maxLength || 850000)) req.destroy(new Error('response too large'))
      })
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) reject(new Error(`provider status ${res.statusCode}`))
        else resolve(raw)
      })
    })
    req.setTimeout(options.timeout || REQUEST_TIMEOUT_MS, () => req.destroy(new Error('provider timeout')))
    req.on('error', reject)
    req.end()
  })
}

function uniqueStrings(items = []) {
  return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)))
}

function buildQueryContext(keyword = '') {
  const clean = normalizeKeyword(keyword) || keyword
  const compact = clean.replace(/\s+/g, '')
  const artist = KNOWN_ARTISTS[clean] || KNOWN_ARTISTS[compact] || ''
  const base = artist && !clean.includes(artist) ? `${clean} ${artist}` : clean
  return { clean, compact, artist, base }
}

function buildSearchQueries(keyword = '') {
  const { base, compact } = buildQueryContext(keyword)
  const siteQueries = TRUSTED_TAB_DOMAINS.slice(0, 7).map((domain) => `site:${domain} ${base} 吉他谱`)
  return uniqueStrings([
    `${base} 吉他谱`,
    `${base} 和弦谱`,
    `${base} 弹唱谱 变调夹`,
    compact ? `${compact} 吉他谱` : '',
    ...siteQueries,
  ]).slice(0, 10)
}

function getRefType(item = {}) {
  const provider = String(item.provider || '').toLowerCase()
  const text = `${item.title || ''} ${item.snippet || ''} ${item.url || ''}`
  const title = String(item.title || '')
  if (/百度搜索|百度图片|搜索入口|^搜索[:：]/.test(title) || item.result_type === 'fallback') return 'fallback'
  if (provider.includes('image') || item.thumbnail_url || item.image_url || IMAGE_WORD_RE.test(text)) return 'image'
  if (IMPORT_WORD_RE.test(text)) return 'text'
  if (isTrustedHost(item.url)) return 'text'
  return 'web'
}

function isPreviewableReference(ref = {}) {
  return getRefType(ref) === 'image' && Boolean(ref.thumbnail_url || ref.image_url || ref.url)
}

function isImportableReference(ref = {}) {
  const type = getRefType(ref)
  const text = `${ref.title || ''} ${ref.snippet || ''} ${ref.url || ''}`
  if (!['text', 'web'].includes(type)) return false
  if (isSearchHost(ref.url)) return false
  if (BLOCKED_RESOURCE_RE.test(text)) return false
  if (/\.(?:jpg|jpeg|png|webp|gif|pdf|mp3|mp4)(?:\?|$)/i.test(ref.url || '')) return false
  if (isTrustedHost(ref.url) && TAB_WORD_RE.test(text)) return true
  return IMPORT_WORD_RE.test(text) && /吉他谱|和弦谱|弹唱谱|六线谱|变调夹|原调|选调|capo|chord|tab/i.test(ref.title || ref.snippet || '')
}

function scoreReference(item = {}, query = '') {
  const title = String(item.title || '').toLowerCase()
  const text = `${item.title || ''} ${item.snippet || ''} ${item.url || ''}`.toLowerCase()
  const clean = normalizeKeyword(query).toLowerCase()
  const compactClean = clean.replace(/\s+/g, '')
  const compactAll = text.replace(/\s+/g, '')
  const host = parseHost(item.url)
  let score = 0

  if (compactClean && title.replace(/\s+/g, '').includes(compactClean)) score += 46
  if (compactClean && compactAll.includes(compactClean)) score += 28
  if (TAB_WORD_RE.test(text)) score += 36
  if (/吉他谱|和弦谱|弹唱谱|六线谱/.test(text)) score += 32
  if (/变调夹|capo|原调|选调|c调|g调|d调|和弦/.test(text)) score += 18
  if (/txt|文本|chord/.test(text)) score += 14
  if (isTrustedHost(item.url)) score += 32
  if (isSearchHost(item.url)) score -= 26
  if (BLOCKED_RESOURCE_RE.test(text)) score -= 35
  if (/百度|bing|搜索/.test(item.title || '') && getRefType(item) !== 'fallback') score -= 14
  if (isImportableReference(item)) score += 18
  if (isPreviewableReference(item)) score += 10
  if (host && TRUSTED_TAB_DOMAINS.includes(host)) score += 5

  return score
}

function enrichReference(ref = {}, query = '') {
  const resultType = getRefType(ref)
  const base = { ...ref, result_type: resultType }
  const importable = isImportableReference(base)
  const previewable = isPreviewableReference(base)
  return {
    ...base,
    importable,
    previewable,
    action_hint: previewable ? 'preview' : importable ? 'import' : 'view_only',
    action_label: previewable ? '预览图片谱' : importable ? '转为谱面' : '仅作参考',
    tab_score: Number(ref.tab_score || 0) || scoreReference(base, query),
  }
}

function makeRef({ title, url, snippet = '', provider = 'web', query = '', resultType = 'web', thumbnailUrl = '', imageUrl = '', scoreBoost = 0 }) {
  const safe = safeUrl(url)
  const raw = {
    title: stripHtml(title).slice(0, 120),
    url: safe.slice(0, 500),
    snippet: stripHtml(snippet).slice(0, 240),
    category: 'tab_reference',
    provider,
    result_type: resultType,
    thumbnail_url: safeUrl(thumbnailUrl),
    image_url: safeUrl(imageUrl),
    source_site: parseHost(safe),
  }
  const ref = enrichReference(raw, query)
  ref.tab_score = scoreReference(ref, query) + Number(scoreBoost || 0)
  return ref
}

function compactReferences(references = [], max = MAX_REFERENCES) {
  const seen = new Set()
  const items = references
    .filter((item) => item && item.title && item.url)
    .map((item) => enrichReference(item))
    .filter((item) => {
      if (!item.url || !item.title) return false
      if (BLOCKED_RESOURCE_RE.test(`${item.title || ''} ${item.snippet || ''}`) && !item.previewable && !item.importable) return false
      const normalizedUrl = item.url.replace(/[?&](?:from|utm_[^=]+|spm|fr|tn|ie|wd|word)=[^&]+/g, '')
      const key = `${parseHost(item.url)}:${stableKey(item.title)}:${normalizedUrl.slice(0, 130)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => {
      const aAction = (a.importable ? 28 : 0) + (a.previewable ? 16 : 0)
      const bAction = (b.importable ? 28 : 0) + (b.previewable ? 16 : 0)
      return (bAction - aAction) || Number(b.tab_score || 0) - Number(a.tab_score || 0)
    })

  const importable = items.filter((item) => item.importable).slice(0, 6)
  const previewable = items.filter((item) => item.previewable).slice(0, 5)
  const viewOnly = items.filter((item) => !item.importable && !item.previewable && item.result_type !== 'fallback').slice(0, Math.max(0, max - importable.length - previewable.length))
  const fallback = items.filter((item) => item.result_type === 'fallback').slice(0, Math.max(0, max - importable.length - previewable.length - viewOnly.length))
  return [...importable, ...previewable, ...viewOnly, ...fallback].slice(0, max)
}

function getBaiduDirectUrl(block = '') {
  const patterns = [/\bmu=(['"])(.*?)\1/i, /\bdata-url=(['"])(.*?)\1/i, /\burl=(['"])(https?:\/\/.*?)\1/i]
  for (const pattern of patterns) {
    const match = block.match(pattern)
    if (match?.[2]) return safeUrl(match[2])
  }
  return ''
}

function parseBaiduWeb(html = '', query = '') {
  const results = []
  const blocks = html.split(/<div[^>]+(?:tpl|class|id)=["'][^"']*(?:result|c-container|result-op|xpath-log)[^"']*["'][^>]*>/i).slice(1)
  for (const block of blocks.slice(0, 12)) {
    const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i)
      || block.match(/<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    const snippetMatch = block.match(/<span[^>]+class=(['"])[^'"]*(?:content-right|c-abstract|c-span-last|c-color-text|c-line-clamp)[^'"]*\1[^>]*>([\s\S]*?)<\/span>/i)
      || block.match(/<div[^>]+class=(['"])[^'"]*(?:c-abstract|content|c-line-clamp|c-result-content)[^'"]*\1[^>]*>([\s\S]*?)<\/div>/i)
      || block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    const ref = makeRef({ title: titleMatch[3], url: getBaiduDirectUrl(block) || titleMatch[2], snippet: snippetMatch?.[2] || snippetMatch?.[1] || '', provider: 'baidu', query, scoreBoost: 8 })
    if (ref.importable || ref.previewable || ref.tab_score > 55) results.push(ref)
  }
  return compactReferences(results, 10)
}

function parseDuckDuckGo(html = '', query = '') {
  const results = []
  const blocks = html.split(/<div[^>]+class=(['"])[^'"]*result[^'"]*\1[^>]*>/i).slice(1)
  for (const block of blocks.slice(0, 12)) {
    const titleMatch = block.match(/<a[^>]+class=(['"])[^'"]*result__a[^'"]*\1[^>]+href=(['"])(.*?)\2[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    const href = titleMatch[3] || titleMatch[2]
    const title = titleMatch[4] || titleMatch[3]
    const snippet = block.match(/<a[^>]+class=(['"])[^'"]*result__snippet[^'"]*\1[^>]*>([\s\S]*?)<\/a>/i)?.[2]
      || block.match(/<div[^>]+class=(['"])[^'"]*result__snippet[^'"]*\1[^>]*>([\s\S]*?)<\/div>/i)?.[2]
      || ''
    const ref = makeRef({ title, url: href, snippet, provider: 'duckduckgo', query, scoreBoost: 12 })
    if (ref.importable || ref.previewable || ref.tab_score > 58) results.push(ref)
  }
  return compactReferences(results, 10)
}

function parseBing(html = '', query = '') {
  const results = []
  const blocks = html.split(/<li[^>]+class=(['"])[^'"]*b_algo[^'"]*\1[^>]*>/i).slice(1)
  for (const block of blocks.slice(0, 12)) {
    const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i)
    if (!titleMatch) continue
    const snippet = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ''
    const ref = makeRef({ title: titleMatch[3], url: titleMatch[2], snippet, provider: 'bing', query, scoreBoost: 10 })
    if (ref.importable || ref.previewable || ref.tab_score > 58) results.push(ref)
  }
  return compactReferences(results, 10)
}

async function searchBaiduWeb(query) {
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=10&ie=utf-8`
  const html = await requestRaw(url, { headers: headers({ Referer: 'https://www.baidu.com/' }) })
  return parseBaiduWeb(html, query)
}

async function searchDuckDuckGo(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const html = await requestRaw(url, { headers: headers({ Referer: 'https://duckduckgo.com/' }) })
  return parseDuckDuckGo(html, query)
}

async function searchBing(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10`
  const html = await requestRaw(url, { headers: headers({ Referer: 'https://www.bing.com/' }) })
  return parseBing(html, query)
}

async function searchBaiduImages(query) {
  const url = `https://image.baidu.com/search/acjson?tn=resultjson_com&ipn=rj&word=${encodeURIComponent(query)}&queryWord=${encodeURIComponent(query)}&pn=0&rn=10&ie=utf-8&oe=utf-8`
  const raw = await requestRaw(url, { headers: headers({ Referer: 'https://image.baidu.com/' }) })
  const data = JSON.parse(raw || '{}')
  const rows = []
  ;(data.data || []).slice(0, 8).forEach((item) => {
    const title = item.fromPageTitleEnc || item.fromPageTitle || item.title || `${query} 图片谱`
    const pageUrl = item.fromURL || item.fromUrl || item.objURL || item.hoverURL || item.middleURL || ''
    const thumb = item.thumbURL || item.thumbnailUrl || item.middleURL || item.objURL || ''
    const imageUrl = item.objURL || item.middleURL || item.hoverURL || thumb
    if (!thumb && !imageUrl) return
    rows.push(makeRef({ title, url: pageUrl || imageUrl, snippet: '图片谱资源，可在线预览。', provider: 'baidu_image', query, resultType: 'image', thumbnailUrl: thumb, imageUrl, scoreBoost: 16 }))
  })
  return compactReferences(rows, 6)
}

async function safeSearch(task, label, query) {
  try {
    return await task()
  } catch (error) {
    console.log(`${label} failed`, query, error?.message || error)
    return []
  }
}

async function searchFast(keyword = '') {
  const queries = buildSearchQueries(keyword)
  const priorityQueries = queries.slice(0, 4)
  const siteQueries = queries.slice(4)
  const tasks = []

  priorityQueries.forEach((query, index) => {
    tasks.push(safeSearch(() => searchBaiduWeb(query), 'baidu web', query))
    tasks.push(safeSearch(() => searchDuckDuckGo(query), 'duckduckgo', query))
    if (index < 2) tasks.push(safeSearch(() => searchBing(query), 'bing', query))
    if (index === 0) tasks.push(safeSearch(() => searchBaiduImages(query), 'baidu image', query))
  })
  siteQueries.slice(0, 5).forEach((query) => {
    tasks.push(safeSearch(() => searchBing(query), 'bing site', query))
    tasks.push(safeSearch(() => searchDuckDuckGo(query), 'duck site', query))
  })

  const results = (await Promise.all(tasks)).flat()
  const references = compactReferences(results, MAX_REFERENCES)
  return {
    references,
    debug: queries.map((query) => ({ query, mode: 'multi_provider_no_key', timeoutMs: REQUEST_TIMEOUT_MS, total: references.length })),
  }
}

function buildFallbackReferences(keyword = '') {
  const clean = normalizeKeyword(keyword) || keyword
  const query = `${clean} 吉他谱 和弦谱 弹唱谱 图片谱`
  return compactReferences([
    makeRef({ title: `搜索：${clean} 吉他谱`, url: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, snippet: `继续检索《${clean}》吉他谱、和弦谱与弹唱谱。`, provider: 'baidu', query, resultType: 'fallback', scoreBoost: 20 }),
    makeRef({ title: `图片谱：${clean}`, url: `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(query)}`, snippet: `继续检索《${clean}》图片谱。`, provider: 'baidu_image', query, resultType: 'fallback', scoreBoost: 19 }),
  ], MAX_REFERENCES)
}

function extractArrangementHints(references = []) {
  const text = references.map((item) => `${item.title || ''} ${item.snippet || ''}`).join(' ')
  const possibleKeys = Array.from(text.matchAll(/([A-G](?:#|b)?|[1-7])\s*(?:调|key)/gi)).map((match) => match[0].replace(/\s+/g, '')).slice(0, 4)
  const possibleCapos = Array.from(text.matchAll(/(?:变调夹|capo)\s*[:：]?\s*([0-9一二三四五六七八九十]+)\s*(?:品|fret)?/gi)).map((match) => `变调夹${match[1]}品`).slice(0, 4)
  const possibleChords = Array.from(new Set(Array.from(text.matchAll(/\b[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus)?(?:2|4|5|6|7|9|11|13)?\b/g)).map((match) => match[0]))).slice(0, 10)
  return {
    possibleKeys: Array.from(new Set(possibleKeys)),
    possibleCapos: Array.from(new Set(possibleCapos)),
    possibleChords,
    tabReferenceCount: references.length,
    imageReferenceCount: references.filter((item) => item.previewable).length,
    textReferenceCount: references.filter((item) => item.importable).length,
    viewOnlyCount: references.filter((item) => !item.importable && !item.previewable).length,
  }
}

function buildCandidate(keyword, references, debug = []) {
  const clean = normalizeKeyword(keyword) || keyword
  const refs = references.length ? references : buildFallbackReferences(clean)
  const artist = KNOWN_ARTISTS[clean] || KNOWN_ARTISTS[clean.replace(/\s+/g, '')] || ''
  const hints = extractArrangementHints(refs)
  return {
    title: clean,
    artist,
    album: '',
    duration: 0,
    confidence: references.length ? 0.9 : 0.58,
    source: references.length ? 'multi_provider_tab_search' : 'tab_resource_entry',
    summary: references.length
      ? `已找到 ${refs.length} 条曲谱资源，其中 ${hints.imageReferenceCount || 0} 条可预览图片谱、${hints.textReferenceCount || 0} 条可转谱资源。`
      : '未命中稳定资源，可换更完整歌名或使用 AI 编配。',
    references: refs.slice(0, 8),
    tabReferences: refs,
    arrangementHints: hints,
    searchDebug: debug,
    provider: 'multi_provider_no_key',
  }
}

exports.main = async (event = {}) => {
  const action = event.action || 'tabLookup'
  const keyword = String(event.keyword || event.query || '').trim()
  const forceRefresh = Boolean(event.force_refresh || event.forceRefresh)
  if (!['songLookup', 'tabLookup'].includes(action)) return jsonResponse(400, `Unknown action: ${action}`)
  if (!keyword) return jsonResponse(400, '请输入要搜索的歌曲关键词')

  const cleanKeyword = normalizeKeyword(keyword) || keyword
  const cacheKey = `tab_search:${CACHE_VERSION}:${stableKey(cleanKeyword)}`
  if (!forceRefresh) {
    const memoryCached = getMemoryCache(cacheKey)
    if (memoryCached) return jsonResponse(0, memoryCached)
    const persistentCached = await getPersistentCache(cacheKey)
    if (persistentCached) {
      setMemoryCache(cacheKey, persistentCached)
      return jsonResponse(0, persistentCached)
    }
  }

  try {
    const { references, debug } = await searchFast(keyword)
    const candidate = buildCandidate(keyword, references, debug)
    const response = {
      query: keyword,
      queryVariants: [cleanKeyword],
      tabQueryVariants: buildSearchQueries(keyword),
      tabSearchEnabled: true,
      candidates: [candidate],
      canGenerate: true,
      provider: 'multi_provider_no_key',
      cacheVersion: CACHE_VERSION,
      notice: '已使用多搜索源检索，并分为图片谱、可转谱资源和参考结果。',
      debug,
    }
    setMemoryCache(cacheKey, response)
    await setPersistentCache(cacheKey, response)
    return jsonResponse(0, response)
  } catch (error) {
    console.error('web-search error:', error)
    const fallbackCandidate = buildCandidate(keyword, [], [{ error: error?.message || String(error), mode: 'fallback' }])
    return jsonResponse(0, {
      query: keyword,
      queryVariants: [cleanKeyword],
      tabQueryVariants: buildSearchQueries(keyword),
      tabSearchEnabled: true,
      candidates: [fallbackCandidate],
      canGenerate: true,
      provider: 'multi_provider_fallback',
      cacheVersion: CACHE_VERSION,
      notice: '暂未命中稳定资源，可重新搜索更完整歌名或使用 AI 编配。',
      debug: fallbackCandidate.searchDebug,
    })
  }
}
