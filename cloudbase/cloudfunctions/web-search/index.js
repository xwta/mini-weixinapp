const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const cacheCollection = db.collection('web_search_cache')

// v9：防超时版。搜索函数只做“快搜 + 分流 + 兜底”，深度解析交给 resource-tab-import。
const GLOBAL_DEADLINE_MS = 2800
const REQUEST_TIMEOUT_MS = 1100
const MAX_HTML_LENGTH = 180 * 1024
const MAX_REFERENCES = 14
const CACHE_TTL_MS = 8 * 60 * 60 * 1000
const CACHE_VERSION = 'v9-timeboxed-search'
const USER_AGENT = process.env.WEB_SEARCH_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'

const memoryCache = new Map()

const KNOWN_ARTISTS = {
  '晴天': '周杰伦', '七里香': '周杰伦', '稻香': '周杰伦', '青花瓷': '周杰伦', '成都': '赵雷',
  '平凡之路': '朴树', '蓝莲花': '许巍', '曾经的你': '许巍', '海阔天空': 'Beyond', '光辉岁月': 'Beyond',
  '十年': '陈奕迅', '江南': '林俊杰', '演员': '薛之谦', '消愁': '毛不易', '董小姐': '宋冬野',
  '安和桥': '宋冬野', '起风了': '买辣椒也用券', '后来': '刘若英', '小幸运': '田馥甄',
  '遇见': '孙燕姿', '红豆': '王菲', '同桌的你': '老狼', '贝加尔湖畔': '李健', '童话': '光良',
}

const TRUSTED_DOMAINS = ['52cmajor.com', 'iloveguitar.cn', 'jita5.com', 'jitabang.com', 'qupu123.com', 'jitatang.com', '17jita.com']
const SEARCH_HOSTS = ['baidu.com', 'm.baidu.com', 'image.baidu.com', 'bing.com', 'duckduckgo.com', 'sogou.com']
const BLOCKED_RE = /(?:视频|教学|下载|网盘|app|破解|付费|登录|论坛|社区|问答|伴奏|mp3|mp4|课程|教程)/i
const TAB_RE = /吉他谱|和弦谱|弹唱谱|六线谱|图片谱|文本谱|变调夹|原调|选调|capo|chord|tab|guitar/i
const IMPORT_RE = /吉他谱|和弦谱|弹唱谱|六线谱|文本谱|txt|变调夹|原调|选调|capo|chord|tab/i
const IMAGE_RE = /图片谱|高清|image|jpg|png|webp|jpeg/i

function jsonResponse(code, dataOrMessage) {
  return code === 0 ? { code, data: dataOrMessage } : { code, message: dataOrMessage }
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

function normalizeKeyword(keyword = '') {
  return String(keyword || '')
    .replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|歌词|歌曲|简谱|完整版|原版|简单版|教学|指弹|尤克里里|六线谱|gtp|guitar\s*(?:tab|chords?)?|chords?|tabs?/gi, ' ')
    .replace(/[《》【】\[\]（）()]/g, ' ')
    .replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ')
    .trim()
}

function stableKey(text = '') {
  return normalizeKeyword(text).replace(/\s+/g, '').toLowerCase()
}

function safeUrl(url = '', baseUrl = '') {
  try {
    let raw = decodeHtml(String(url || '').trim())
    if (!raw || raw.startsWith('javascript:') || raw.startsWith('#')) return ''
    if (raw.startsWith('/l/?') || raw.includes('duckduckgo.com/l/?')) {
      const full = raw.startsWith('http') ? raw : `https://duckduckgo.com${raw}`
      const parsedDuck = new URL(full)
      const uddg = parsedDuck.searchParams.get('uddg')
      if (uddg) raw = decodeURIComponent(uddg)
    }
    if (baseUrl && !/^https?:\/\//i.test(raw) && !raw.startsWith('//')) raw = new URL(raw, baseUrl).toString()
    if (raw.startsWith('//')) raw = `https:${raw}`
    const parsed = new URL(raw)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : ''
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
  return TRUSTED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function isSearchHost(url = '') {
  const host = parseHost(url)
  return SEARCH_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function isSearchPage(url = '') {
  return /(?:\/search(?:\/|\?|$)|search\.asp|\/so(?:\/|\?|$)|\/Search(?:\/|\?|$))/i.test(url)
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
  if (memoryCache.size > 120) memoryCache.delete(memoryCache.keys().next().value)
}

async function getPersistentCache(cacheKey) {
  try {
    const result = await cacheCollection.where({ cache_key: cacheKey }).limit(1).get()
    const row = result.data?.[0]
    if (!row?.created_at) return null
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
      req = transport.request({ method: 'GET', hostname: parsed.hostname, path: `${parsed.pathname}${parsed.search}`, headers: options.headers || headers() }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume()
          const nextUrl = new URL(res.headers.location, url).toString()
          requestRaw(nextUrl, options).then(finish).catch(fail)
          return
        }
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          raw += chunk
          if (raw.length >= (options.maxLength || MAX_HTML_LENGTH)) finish(raw)
        })
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) fail(new Error(`provider status ${res.statusCode}`))
          else finish(raw)
        })
        res.on('error', fail)
      })
      req.setTimeout(options.timeout || REQUEST_TIMEOUT_MS, () => fail(new Error('provider timeout')))
      req.on('error', fail)
      req.end()
    } catch (error) {
      fail(error)
    }
  })
}

function settleWithin(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

async function safeSearch(task, label, query) {
  try {
    return await task()
  } catch (error) {
    console.log(`${label} failed`, query, error?.message || error)
    return []
  }
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
  return Array.from(new Set([
    `${base} 吉他谱`,
    `${base} 和弦谱`,
    `${base} 弹唱谱 变调夹`,
    compact ? `${compact} 吉他谱` : '',
    `site:52cmajor.com ${base} 吉他谱`,
    `site:iloveguitar.cn ${base} 吉他谱`,
    `site:jita5.com ${base} 吉他谱`,
    `site:jitabang.com ${base} 吉他谱`,
    `site:qupu123.com ${base} 吉他谱`,
  ].filter(Boolean))).slice(0, 9)
}

function getRefType(item = {}) {
  const provider = String(item.provider || '').toLowerCase()
  const text = `${item.title || ''} ${item.snippet || ''} ${item.url || ''}`
  const title = String(item.title || '')
  if (/百度搜索|百度图片|搜索入口|曲谱站搜索|^搜索[:：]/.test(title) || item.result_type === 'fallback') return 'fallback'
  if (provider.includes('image') || item.thumbnail_url || item.image_url || IMAGE_RE.test(text)) return 'image'
  if (IMPORT_RE.test(text) || isTrustedHost(item.url)) return 'text'
  return 'web'
}

function isPreviewableReference(ref = {}) {
  return getRefType(ref) === 'image' && Boolean(ref.thumbnail_url || ref.image_url || ref.url)
}

function isImportableReference(ref = {}) {
  const type = getRefType(ref)
  const text = `${ref.title || ''} ${ref.snippet || ''} ${ref.url || ''}`
  if (!['text', 'web'].includes(type)) return false
  if (isSearchHost(ref.url) || isSearchPage(ref.url)) return false
  if (BLOCKED_RE.test(text)) return false
  if (/\.(?:jpg|jpeg|png|webp|gif|pdf|mp3|mp4)(?:\?|$)/i.test(ref.url || '')) return false
  if (isTrustedHost(ref.url) && TAB_RE.test(text)) return true
  return IMPORT_RE.test(text) && /吉他谱|和弦谱|弹唱谱|六线谱|变调夹|原调|选调|capo|chord|tab/i.test(ref.title || ref.snippet || '')
}

function scoreReference(item = {}, query = '') {
  const title = String(item.title || '').toLowerCase()
  const text = `${item.title || ''} ${item.snippet || ''} ${item.url || ''}`.toLowerCase()
  const clean = normalizeKeyword(query).toLowerCase()
  const compactClean = clean.replace(/\s+/g, '')
  const compactAll = text.replace(/\s+/g, '')
  let score = 0
  if (compactClean && title.replace(/\s+/g, '').includes(compactClean)) score += 46
  if (compactClean && compactAll.includes(compactClean)) score += 24
  if (TAB_RE.test(text)) score += 32
  if (/吉他谱|和弦谱|弹唱谱|六线谱/.test(text)) score += 26
  if (/变调夹|capo|原调|选调|c调|g调|d调|和弦/.test(text)) score += 14
  if (isTrustedHost(item.url)) score += 36
  if (item.provider === 'site_adapter') score += 26
  if (isSearchHost(item.url)) score -= 26
  if (isSearchPage(item.url)) score -= 20
  if (BLOCKED_RE.test(text)) score -= 35
  if (isImportableReference(item)) score += 20
  if (isPreviewableReference(item)) score += 12
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
  if (!safe) return null
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

function compactReferences(references = [], max = MAX_REFERENCES, query = '') {
  const seen = new Set()
  const items = references
    .filter(Boolean)
    .filter((item) => item.title && item.url)
    .map((item) => enrichReference(item, query))
    .filter((item) => {
      if (BLOCKED_RE.test(`${item.title || ''} ${item.snippet || ''}`) && !item.previewable && !item.importable) return false
      const key = `${parseHost(item.url)}:${stableKey(item.title)}:${item.url.replace(/[?#].*$/, '').slice(0, 140)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => {
      const aAction = (a.importable ? 30 : 0) + (a.previewable ? 16 : 0)
      const bAction = (b.importable ? 30 : 0) + (b.previewable ? 16 : 0)
      return (bAction - aAction) || Number(b.tab_score || 0) - Number(a.tab_score || 0)
    })
  const importable = items.filter((item) => item.importable).slice(0, 5)
  const previewable = items.filter((item) => item.previewable).slice(0, 5)
  const viewOnly = items.filter((item) => !item.importable && !item.previewable && item.result_type !== 'fallback').slice(0, Math.max(0, max - importable.length - previewable.length))
  const fallback = items.filter((item) => item.result_type === 'fallback').slice(0, Math.max(0, max - importable.length - previewable.length - viewOnly.length))
  return [...importable, ...previewable, ...viewOnly, ...fallback].slice(0, max)
}

function parseAnchors(html = '', baseUrl = '', query = '', provider = 'site_adapter') {
  const rows = []
  const anchorRe = /<a\s+[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = anchorRe.exec(html)) && rows.length < 16) {
    const url = safeUrl(match[2], baseUrl)
    const title = stripHtml(match[3])
    if (!url || !title || title.length < 2) continue
    if (isSearchHost(url) || isSearchPage(url)) continue
    const compactQuery = stableKey(query)
    const compactTitle = stableKey(title)
    const combined = `${title} ${url}`
    if (!TAB_RE.test(combined) && compactQuery && !compactTitle.includes(compactQuery.slice(0, Math.min(8, compactQuery.length)))) continue
    rows.push(makeRef({ title, url, snippet: '曲谱站结果，优先用于转谱。', provider, query, resultType: 'text', scoreBoost: 26 }))
  }
  return compactReferences(rows, 5, query)
}

async function searchSiteByBing(domain, query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(`site:${domain} ${query} 吉他谱`)}&count=6`
  const html = await requestRaw(url, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://www.bing.com/' }) })
  return parseBing(html, query)
}

function parseBing(html = '', query = '') {
  const results = []
  const blocks = html.split(/<li[^>]+class=(['"])[^'"]*b_algo[^'"]*\1[^>]*>/i).slice(1)
  for (const block of blocks.slice(0, 6)) {
    const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i)
    if (!titleMatch) continue
    const snippet = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ''
    const ref = makeRef({ title: titleMatch[3], url: titleMatch[2], snippet, provider: 'bing', query, scoreBoost: 10 })
    if (ref && (ref.importable || ref.previewable || ref.tab_score > 50)) results.push(ref)
  }
  return compactReferences(results, 7, query)
}

function parseBaiduWeb(html = '', query = '') {
  const results = []
  const blocks = html.split(/<div[^>]+(?:tpl|class|id)=["'][^"']*(?:result|c-container|result-op|xpath-log)[^"']*["'][^>]*>/i).slice(1)
  for (const block of blocks.slice(0, 6)) {
    const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i)
      || block.match(/<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    const snippet = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ''
    const ref = makeRef({ title: titleMatch[3], url: titleMatch[2], snippet, provider: 'baidu', query, scoreBoost: 8 })
    if (ref && (ref.importable || ref.previewable || ref.tab_score > 50)) results.push(ref)
  }
  return compactReferences(results, 7, query)
}

function parseDuckDuckGo(html = '', query = '') {
  const results = []
  const blocks = html.split(/<div[^>]+class=(['"])[^'"]*result[^'"]*\1[^>]*>/i).slice(1)
  for (const block of blocks.slice(0, 6)) {
    const titleMatch = block.match(/<a[^>]+class=(['"])[^'"]*result__a[^'"]*\1[^>]+href=(['"])(.*?)\2[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    const href = titleMatch[3] || titleMatch[2]
    const title = titleMatch[4] || titleMatch[3]
    const snippet = block.match(/result__snippet[^>]*>([\s\S]*?)<\/[^>]+>/i)?.[1] || ''
    const ref = makeRef({ title, url: href, snippet, provider: 'duckduckgo', query, scoreBoost: 10 })
    if (ref && (ref.importable || ref.previewable || ref.tab_score > 52)) results.push(ref)
  }
  return compactReferences(results, 7, query)
}

async function searchBaiduWeb(query) {
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=6&ie=utf-8`
  const html = await requestRaw(url, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://www.baidu.com/' }) })
  return parseBaiduWeb(html, query)
}

async function searchDuckDuckGo(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const html = await requestRaw(url, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://duckduckgo.com/' }) })
  return parseDuckDuckGo(html, query)
}

async function searchBing(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=6`
  const html = await requestRaw(url, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://www.bing.com/' }) })
  return parseBing(html, query)
}

async function searchBaiduImages(query) {
  const url = `https://image.baidu.com/search/acjson?tn=resultjson_com&ipn=rj&word=${encodeURIComponent(query)}&queryWord=${encodeURIComponent(query)}&pn=0&rn=6&ie=utf-8&oe=utf-8`
  const raw = await requestRaw(url, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://image.baidu.com/' }), maxLength: 160 * 1024 })
  const data = JSON.parse(raw || '{}')
  const rows = []
  ;(data.data || []).slice(0, 4).forEach((item) => {
    const title = item.fromPageTitleEnc || item.fromPageTitle || item.title || `${query} 图片谱`
    const pageUrl = item.fromURL || item.fromUrl || item.objURL || item.hoverURL || item.middleURL || ''
    const thumb = item.thumbURL || item.thumbnailUrl || item.middleURL || item.objURL || ''
    const imageUrl = item.objURL || item.middleURL || item.hoverURL || thumb
    if (!thumb && !imageUrl) return
    rows.push(makeRef({ title, url: pageUrl || imageUrl, snippet: '图片谱资源，可在线预览。', provider: 'baidu_image', query, resultType: 'image', thumbnailUrl: thumb, imageUrl, scoreBoost: 14 }))
  })
  return compactReferences(rows, 5, query)
}

function buildFallbackReferences(keyword = '') {
  const { base } = buildQueryContext(keyword)
  const query = `${base} 吉他谱 和弦谱 弹唱谱 图片谱`
  const siteRefs = TRUSTED_DOMAINS.slice(0, 5).map((domain) => makeRef({
    title: `曲谱站搜索：${base}`,
    url: `https://www.baidu.com/s?wd=${encodeURIComponent(`site:${domain} ${base} 吉他谱`)}`,
    snippet: `在 ${domain} 中继续查找《${base}》吉他谱。`,
    provider: 'trusted_site_entry',
    query,
    resultType: 'fallback',
    scoreBoost: 12,
  }))
  return compactReferences([
    makeRef({ title: `搜索：${base} 吉他谱`, url: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, snippet: `继续检索《${base}》吉他谱、和弦谱与弹唱谱。`, provider: 'baidu', query, resultType: 'fallback', scoreBoost: 16 }),
    makeRef({ title: `图片谱：${base}`, url: `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(query)}`, snippet: `继续检索《${base}》图片谱。`, provider: 'baidu_image', query, resultType: 'fallback', scoreBoost: 14 }),
    ...siteRefs,
  ], MAX_REFERENCES, query)
}

async function searchFast(keyword = '') {
  const queries = buildSearchQueries(keyword)
  const q1 = queries[0]
  const q2 = queries[1] || q1
  const jobs = [
    safeSearch(() => searchBing(q1), 'bing web', q1),
    safeSearch(() => searchDuckDuckGo(q1), 'duck web', q1),
    safeSearch(() => searchBaiduWeb(q1), 'baidu web', q1),
    safeSearch(() => searchBaiduImages(q1), 'baidu image', q1),
    safeSearch(() => searchBing(q2), 'bing chord', q2),
    safeSearch(() => searchSiteByBing('52cmajor.com', q1), 'site 52cmajor', q1),
    safeSearch(() => searchSiteByBing('jita5.com', q1), 'site jita5', q1),
  ]
  const rawResults = (await settleWithin(Promise.all(jobs), GLOBAL_DEADLINE_MS, [])).flat()
  const references = compactReferences(rawResults, MAX_REFERENCES, keyword)
  return {
    references: references.length ? references : buildFallbackReferences(keyword),
    debug: queries.map((query) => ({ query, mode: 'timeboxed_search', timeoutMs: REQUEST_TIMEOUT_MS, total: references.length })),
  }
}

function extractArrangementHints(references = []) {
  const text = references.map((item) => `${item.title || ''} ${item.snippet || ''}`).join(' ')
  const possibleKeys = Array.from(text.matchAll(/([A-G](?:#|b)?|[1-7])\s*(?:调|key)/gi)).map((match) => match[0].replace(/\s+/g, '')).slice(0, 4)
  const possibleCapos = Array.from(text.matchAll(/(?:变调夹|capo)\s*[:：]?\s*([0-9一二三四五六七八九十]+)\s*(?:品|fret)?/gi)).map((match) => `变调夹${match[1]}品`).slice(0, 4)
  return {
    possibleKeys: Array.from(new Set(possibleKeys)),
    possibleCapos: Array.from(new Set(possibleCapos)),
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
    confidence: refs.some((item) => item.importable || item.previewable) ? 0.88 : 0.56,
    source: refs.some((item) => item.importable || item.previewable) ? 'timeboxed_tab_search' : 'tab_search_entry',
    summary: `已返回 ${refs.length} 条曲谱资源，其中 ${hints.imageReferenceCount || 0} 条可预览图片谱、${hints.textReferenceCount || 0} 条可转谱资源。`,
    references: refs.slice(0, 8),
    tabReferences: refs,
    arrangementHints: hints,
    searchDebug: debug,
    provider: 'timeboxed_search',
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
    const searchResult = await settleWithin(searchFast(keyword), GLOBAL_DEADLINE_MS + 300, { references: buildFallbackReferences(keyword), debug: [] })
    const candidate = buildCandidate(keyword, searchResult.references || [], searchResult.debug || [])
    const response = {
      query: keyword,
      queryVariants: [cleanKeyword],
      tabQueryVariants: buildSearchQueries(keyword),
      tabSearchEnabled: true,
      candidates: [candidate],
      canGenerate: true,
      provider: 'timeboxed_search',
      cacheVersion: CACHE_VERSION,
      notice: '已启用防超时搜索。网络慢时会先返回曲谱站入口，不再让云函数卡死。',
      debug: searchResult.debug || [],
    }
    setMemoryCache(cacheKey, response)
    await setPersistentCache(cacheKey, response)
    return jsonResponse(0, response)
  } catch (error) {
    console.error('web-search error:', error)
    const fallbackCandidate = buildCandidate(keyword, buildFallbackReferences(keyword), [{ error: error?.message || String(error), mode: 'hard_fallback' }])
    return jsonResponse(0, {
      query: keyword,
      queryVariants: [cleanKeyword],
      tabQueryVariants: buildSearchQueries(keyword),
      tabSearchEnabled: true,
      candidates: [fallbackCandidate],
      canGenerate: true,
      provider: 'timeboxed_fallback',
      cacheVersion: CACHE_VERSION,
      notice: '网络搜索暂时较慢，已返回曲谱站快速入口。',
      debug: fallbackCandidate.searchDebug,
    })
  }
}
