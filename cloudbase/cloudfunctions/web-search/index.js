const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const REQUEST_TIMEOUT_MS = 2600
const MAX_REFERENCES = 10
const CACHE_TTL_MS = 3 * 60 * 60 * 1000
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
  'jita5.com', 'jitabang.com', 'tan8.com', '17jita.com', 'cangqiang.com', 'qupu123.com',
  '52cmajor.com', 'iloveguitar.cn', 'jitatang.com', 'jita123.com', 'ultimate-guitar.com', 'e-chords.com', 'chordify.net',
]

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
    let raw = decodeHtml(String(url || '')).trim()
    if (!raw) return ''
    if (raw.startsWith('//')) raw = `https:${raw}`
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

function getCache(key) {
  const cached = memoryCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    memoryCache.delete(key)
    return null
  }
  return cached.value
}

function setCache(key, value) {
  memoryCache.set(key, { value, createdAt: Date.now() })
  if (memoryCache.size > 120) {
    const firstKey = memoryCache.keys().next().value
    if (firstKey) memoryCache.delete(firstKey)
  }
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
    const req = transport.request(
      {
        method: 'GET',
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        headers: options.headers || {},
      },
      (res) => {
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          raw += chunk
          if (raw.length > 900000) req.destroy(new Error('response too large'))
        })
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`provider status ${res.statusCode}`))
            return
          }
          resolve(raw)
        })
      }
    )
    req.setTimeout(options.timeout || REQUEST_TIMEOUT_MS, () => req.destroy(new Error('provider timeout')))
    req.on('error', reject)
    req.end()
  })
}

function uniqueStrings(items = []) {
  return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)))
}

function buildFastQueries(keyword = '') {
  const clean = normalizeKeyword(keyword) || keyword
  const compact = clean.replace(/\s+/g, '')
  const artist = KNOWN_ARTISTS[clean] || KNOWN_ARTISTS[compact] || ''
  const main = artist ? `${clean} ${artist} 吉他谱` : `${clean} 吉他谱`
  const image = artist ? `${clean} ${artist} 高清图片谱` : `${clean} 高清图片谱`
  return uniqueStrings([main, image]).slice(0, 2)
}

function isTabLike(text = '') {
  return /吉他谱|和弦谱|弹唱谱|六线谱|图片谱|gtp|guitar|chord|tab|变调夹|capo|c调|g调|原调|和弦/i.test(text)
}

function scoreReference(item = {}, query = '') {
  const text = `${item.title || ''} ${item.snippet || ''} ${item.url || ''}`.toLowerCase()
  const clean = normalizeKeyword(query).toLowerCase()
  const compactClean = clean.replace(/\s+/g, '')
  const compactAll = text.replace(/\s+/g, '')
  const host = parseHost(item.url)
  let score = 0
  if (isTabLike(text)) score += 48
  if (/吉他谱|和弦谱|弹唱谱|六线谱|图片谱/.test(text)) score += 34
  if (item.result_type === 'image' || item.thumbnail_url) score += 14
  if (compactClean && compactAll.includes(compactClean)) score += 30
  if (TRUSTED_TAB_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) score += 20
  if (/搜索|百度|bing/.test(item.title || '')) score -= 10
  return score
}

function makeRef({ title, url, snippet = '', provider = 'baidu', query = '', resultType = 'web', thumbnailUrl = '', imageUrl = '', scoreBoost = 0 }) {
  const ref = {
    title: stripHtml(title).slice(0, 120),
    url: safeUrl(url).slice(0, 500),
    snippet: stripHtml(snippet).slice(0, 220),
    category: 'tab_reference',
    provider,
    result_type: resultType,
    thumbnail_url: safeUrl(thumbnailUrl),
    image_url: safeUrl(imageUrl),
    source_site: parseHost(url),
  }
  ref.tab_score = scoreReference(ref, query) + Number(scoreBoost || 0)
  return ref
}

function compactReferences(references = [], max = MAX_REFERENCES) {
  const seen = new Set()
  return references
    .filter((item) => item && item.title && item.url)
    .filter((item) => {
      const key = item.url || `${item.title}|${item.provider}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => Number(b.tab_score || 0) - Number(a.tab_score || 0))
    .slice(0, max)
}

function getBaiduDirectUrl(block = '') {
  const patterns = [
    /\bmu=(['"])(.*?)\1/i,
    /\bdata-url=(['"])(.*?)\1/i,
    /\burl=(['"])(https?:\/\/.*?)\1/i,
  ]
  for (const pattern of patterns) {
    const match = block.match(pattern)
    if (match?.[2]) return safeUrl(match[2])
  }
  return ''
}

function parseBaiduWeb(html = '', query = '') {
  const results = []
  const blocks = html.split(/<div[^>]+(?:tpl|class|id)=["'][^"']*(?:result|c-container|result-op|xpath-log)[^"']*["'][^>]*>/i).slice(1)
  for (const block of blocks.slice(0, 10)) {
    const dataTools = block.match(/data-tools=(['"])([\s\S]*?)\1/i)
    if (dataTools?.[2]) {
      try {
        const data = JSON.parse(decodeHtml(dataTools[2]))
        if (data.title && (data.url || data.mu)) {
          results.push(makeRef({ title: data.title, url: data.url || data.mu, provider: 'baidu', query, scoreBoost: 10 }))
        }
      } catch (_error) {}
    }

    const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i)
      || block.match(/<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    const snippetMatch = block.match(/<span[^>]+class=(['"])[^'"]*(?:content-right|c-abstract|c-span-last|c-color-text|c-line-clamp)[^'"]*\1[^>]*>([\s\S]*?)<\/span>/i)
      || block.match(/<div[^>]+class=(['"])[^'"]*(?:c-abstract|content|c-line-clamp|c-result-content)[^'"]*\1[^>]*>([\s\S]*?)<\/div>/i)
      || block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    results.push(makeRef({
      title: titleMatch[3],
      url: getBaiduDirectUrl(block) || titleMatch[2],
      snippet: snippetMatch?.[2] || snippetMatch?.[1] || '',
      provider: 'baidu',
      query,
      scoreBoost: 12,
    }))
  }
  return compactReferences(results, 7)
}

async function searchBaiduWeb(query) {
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=8&ie=utf-8`
  const html = await requestRaw(url, { headers: headers({ Referer: 'https://www.baidu.com/' }) })
  return parseBaiduWeb(html, query)
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
    rows.push(makeRef({
      title,
      url: pageUrl || imageUrl,
      snippet: '百度图片搜索到的吉他谱/图片谱缩略图，可作为谱源线索。',
      provider: 'baidu_image',
      query,
      resultType: 'image',
      thumbnailUrl: thumb,
      imageUrl,
      scoreBoost: 18,
    }))
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
  const queries = buildFastQueries(keyword)
  const tasks = []
  queries.forEach((query, index) => {
    tasks.push(safeSearch(() => searchBaiduWeb(query), 'baidu web', query))
    if (index === 0) tasks.push(safeSearch(() => searchBaiduImages(query), 'baidu image', query))
  })
  const results = (await Promise.all(tasks)).flat()
  return {
    references: compactReferences(results, MAX_REFERENCES),
    debug: queries.map((query) => ({ query, mode: 'fast_baidu', timeoutMs: REQUEST_TIMEOUT_MS })),
  }
}

function buildFallbackReferences(keyword = '') {
  const clean = normalizeKeyword(keyword) || keyword
  const query = `${clean} 吉他谱 和弦谱 弹唱谱 图片谱`
  return compactReferences([
    makeRef({ title: `百度搜索：${clean} 吉他谱`, url: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, snippet: `打开百度继续检索《${clean}》吉他谱/和弦谱/弹唱谱。`, provider: 'baidu', query, resultType: 'fallback', scoreBoost: 20 }),
    makeRef({ title: `百度图片：${clean} 吉他谱`, url: `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(query)}`, snippet: `打开百度图片继续检索《${clean}》图片谱。`, provider: 'baidu_image', query, resultType: 'fallback', scoreBoost: 19 }),
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
    imageReferenceCount: references.filter((item) => item.result_type === 'image' || item.thumbnail_url).length,
    textReferenceCount: references.filter((item) => item.result_type !== 'image' && !item.thumbnail_url).length,
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
    confidence: references.length ? 0.86 : 0.58,
    source: references.length ? 'fast_baidu_search' : 'fast_baidu_fallback',
    summary: references.length
      ? `快速百度搜索到 ${refs.length} 条吉他谱线索，其中 ${hints.imageReferenceCount || 0} 条图片谱。`
      : '实时搜索未稳定拿到结果，已提供可直接打开的百度搜索入口。',
    references: refs.slice(0, 8),
    tabReferences: refs,
    arrangementHints: hints,
    searchDebug: debug,
    provider: 'fast_baidu',
  }
}

exports.main = async (event = {}) => {
  const action = event.action || 'tabLookup'
  const keyword = String(event.keyword || event.query || '').trim()
  if (!['songLookup', 'tabLookup'].includes(action)) return jsonResponse(400, `Unknown action: ${action}`)
  if (!keyword) return jsonResponse(400, '请输入要搜索的歌曲关键词')

  const cleanKeyword = normalizeKeyword(keyword) || keyword
  const cacheKey = `fast_baidu:${cleanKeyword.toLowerCase()}`
  const cached = getCache(cacheKey)
  if (cached) return jsonResponse(0, cached)

  try {
    const { references, debug } = await searchFast(keyword)
    const candidate = buildCandidate(keyword, references, debug)
    const response = {
      query: keyword,
      queryVariants: [cleanKeyword],
      tabQueryVariants: buildFastQueries(keyword),
      tabSearchEnabled: true,
      candidates: [candidate],
      canGenerate: true,
      provider: 'fast_baidu',
      notice: '搜索结果仅展示公开网页/图片搜索的标题、摘要、缩略图和链接，不抓取、不复制第三方完整歌词或完整曲谱。',
      debug,
    }
    setCache(cacheKey, response)
    return jsonResponse(0, response)
  } catch (error) {
    console.error('web-search error:', error)
    const fallbackCandidate = buildCandidate(keyword, [], [{ error: error?.message || String(error), mode: 'fallback' }])
    return jsonResponse(0, {
      query: keyword,
      queryVariants: [cleanKeyword],
      tabQueryVariants: buildFastQueries(keyword),
      tabSearchEnabled: true,
      candidates: [fallbackCandidate],
      canGenerate: true,
      provider: 'fast_baidu_fallback',
      notice: '实时搜索超时或失败，已提供可直接打开的百度搜索入口。',
      debug: fallbackCandidate.searchDebug,
    })
  }
}
