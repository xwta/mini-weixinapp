const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEFAULT_TIMEOUT_MS = 9000
const MAX_RESULTS = 8
const MAX_TAB_REFERENCES = 14
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

const TAB_DOMAINS = [
  'jita5.com', 'jitabang.com', 'tan8.com', '17jita.com', 'cangqiang.com', 'qupu123.com',
  '52cmajor.com', 'iloveguitar.cn', 'jitatang.com', 'ultimate-guitar.com', 'e-chords.com', 'chordify.net',
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

function uniqueStrings(items = []) {
  return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)))
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
  if (memoryCache.size > 200) {
    const firstKey = memoryCache.keys().next().value
    if (firstKey) memoryCache.delete(firstKey)
  }
}

function parseHost(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch (_error) {
    return ''
  }
}

function safeUrl(url = '') {
  try {
    let raw = decodeHtml(String(url || '')).trim()
    if (!raw) return ''
    if (raw.startsWith('//')) raw = `https:${raw}`
    const parsed = new URL(raw)
    if (parsed.hostname.includes('duckduckgo.com') && parsed.pathname.startsWith('/l/')) {
      const uddg = parsed.searchParams.get('uddg')
      if (uddg) return safeUrl(decodeURIComponent(uddg))
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString()
  } catch (_error) {
    return ''
  }
}

function requestRaw(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === 'http:' ? require('http') : require('https')
    const req = transport.request(
      {
        method: options.method || 'GET',
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        headers: options.headers || {},
        timeout: options.timeout || DEFAULT_TIMEOUT_MS,
      },
      (res) => {
        const location = res.headers.location
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && location && redirectCount < 4) {
          const nextUrl = new URL(location, url).toString()
          res.resume()
          requestRaw(nextUrl, options, redirectCount + 1).then(resolve).catch(reject)
          return
        }
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          raw += chunk
          if (raw.length > 2200000) req.destroy(new Error('response too large'))
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
    req.on('timeout', () => req.destroy(new Error('provider timeout')))
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

async function requestJson(url, options = {}) {
  const raw = await requestRaw(url, options)
  return JSON.parse(raw || '{}')
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

function buildTabQueryVariants(keyword) {
  const original = String(keyword || '').trim()
  const clean = normalizeKeyword(original) || original
  const compact = clean.replace(/\s+/g, '')
  const artist = KNOWN_ARTISTS[clean] || KNOWN_ARTISTS[compact] || ''
  const baseWithArtist = artist ? `${clean} ${artist}` : clean
  return uniqueStrings([
    `${baseWithArtist} 吉他谱`, `${baseWithArtist} 和弦谱`, `${baseWithArtist} 弹唱谱`, `${baseWithArtist} 六线谱`,
    `${baseWithArtist} 吉他谱 变调夹`, `${baseWithArtist} 吉他谱 C调`, `${baseWithArtist} 高清图片谱`,
    `${baseWithArtist} chords`, `${baseWithArtist} guitar chords`, `${baseWithArtist} guitar tab`,
    `${baseWithArtist} 吉他谱 site:jita5.com`, `${baseWithArtist} 吉他谱 site:jitabang.com`, `${baseWithArtist} 吉他谱 site:tan8.com`,
    `${clean} 吉他谱`, `${compact} 吉他谱`,
  ]).slice(0, 10)
}

function isTabLikeReference(reference = {}) {
  const text = `${reference.title || ''} ${reference.snippet || ''} ${reference.url || ''}`.toLowerCase()
  return /吉他谱|和弦谱|弹唱谱|六线谱|gtp|guitar|chord|chords|tab|tabs|ukulele|尤克里里|变调夹|capo|图片谱/.test(text)
}

function scoreTabReference(reference = {}, keyword = '') {
  const text = `${reference.title || ''} ${reference.snippet || ''} ${reference.url || ''}`.toLowerCase()
  const clean = normalizeKeyword(keyword).toLowerCase()
  const compactClean = clean.replace(/\s+/g, '')
  const compactAll = text.replace(/\s+/g, '')
  const host = parseHost(reference.url)
  let score = 0
  if (isTabLikeReference(reference)) score += 45
  if (/吉他谱|和弦谱|弹唱谱|六线谱|图片谱/.test(text)) score += 34
  if (/chords|guitar chords|guitar tab|tabs/.test(text)) score += 22
  if (/变调夹|capo|c调|g调|d调|原调|选调|和弦/.test(text)) score += 14
  if (reference.result_type === 'image' || reference.thumbnail_url) score += 12
  if (clean && text.includes(clean)) score += 28
  if (compactClean && compactAll.includes(compactClean)) score += 32
  if (TAB_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) score += 18
  if (/百度|bing|duckduckgo|搜索/.test(reference.title || '')) score -= 12
  return score
}

function makeRef(title, url, snippet, provider, query, extra = {}) {
  const item = {
    title: stripHtml(title).slice(0, 120),
    url: safeUrl(url).slice(0, 500),
    snippet: stripHtml(snippet).slice(0, 200),
    category: 'tab_reference',
    provider,
    result_type: extra.result_type || 'web',
    thumbnail_url: safeUrl(extra.thumbnail_url || ''),
    image_url: safeUrl(extra.image_url || ''),
    source_site: extra.source_site || parseHost(url),
  }
  item.tab_score = scoreTabReference(item, query) + Number(extra.scoreBoost || 0)
  return item
}

function compactReferences(references = [], max = MAX_TAB_REFERENCES) {
  const seen = new Set()
  return references
    .map((item) => ({
      title: stripHtml(item.title || '').slice(0, 120),
      url: safeUrl(item.url || '').slice(0, 500),
      snippet: stripHtml(item.snippet || '').slice(0, 200),
      category: item.category || 'tab_reference',
      provider: item.provider || 'web',
      result_type: item.result_type || (item.thumbnail_url ? 'image' : 'web'),
      thumbnail_url: safeUrl(item.thumbnail_url || ''),
      image_url: safeUrl(item.image_url || ''),
      source_site: item.source_site || parseHost(item.url),
      tab_score: Number(item.tab_score || 0),
    }))
    .filter((item) => item.title && item.url)
    .filter((item) => {
      const key = item.url || `${item.title}|${item.provider}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => Number(b.tab_score || 0) - Number(a.tab_score || 0))
    .slice(0, max)
}

function parseBaiduDataTools(block = '', query = '', provider = 'baidu') {
  const refs = []
  const regex = /data-tools=(['"])([\s\S]*?)\1/gi
  let match
  while ((match = regex.exec(block))) {
    const raw = decodeHtml(match[2])
    try {
      const data = JSON.parse(raw)
      const title = data.title || data.dispTitle || data.itemTitle || ''
      const url = data.url || data.linkUrl || data.mu || ''
      if (title && url) refs.push(makeRef(title, url, '', provider, query, { scoreBoost: 10 }))
    } catch (_error) {}
  }
  return refs
}

function extractBaiduMu(block = '') {
  const patterns = [/\bmu=(['"])(.*?)\1/i, /\bdata-url=(['"])(.*?)\1/i, /\burl=(['"])(https?:\/\/.*?)\1/i]
  for (const pattern of patterns) {
    const match = block.match(pattern)
    if (match?.[2]) return safeUrl(match[2])
  }
  return ''
}

function parseBaidu(html = '', query = '', provider = 'baidu') {
  const results = []
  const blocks = html.split(/<div[^>]+(?:tpl|class|id)=["'][^"']*(?:result|c-container|result-op|xpath-log)[^"']*["'][^>]*>/i).slice(1)
  for (const block of blocks) {
    results.push(...parseBaiduDataTools(block, query, provider))
    const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i)
      || block.match(/<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    const directUrl = extractBaiduMu(block) || titleMatch[2]
    const snippetMatch = block.match(/<span[^>]+class=(['"])[^'"]*(?:content-right|c-abstract|c-span-last|c-color-text|c-line-clamp)[^'"]*\1[^>]*>([\s\S]*?)<\/span>/i)
      || block.match(/<div[^>]+class=(['"])[^'"]*(?:c-abstract|content|c-line-clamp|c-result-content)[^'"]*\1[^>]*>([\s\S]*?)<\/div>/i)
      || block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    results.push(makeRef(titleMatch[3], directUrl, snippetMatch?.[2] || snippetMatch?.[1] || '', provider, query, { scoreBoost: provider === 'baidu_mobile' ? 12 : 16 }))
  }
  const h3Regex = /<h3[^>]*>[\s\S]*?<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/gi
  let match
  while (results.length < 3 && (match = h3Regex.exec(html))) {
    results.push(makeRef(match[3], match[2], '', provider, query, { scoreBoost: 8 }))
  }
  return compactReferences(results, MAX_TAB_REFERENCES)
}

function parseSimpleHtmlResults(html = '', query = '', provider = 'web') {
  const results = []
  const blocks = html.split(/<li class="b_algo"[^>]*>|<div class="vrwrap|<div class="results|<div class="rb"|<div class="result results_links[^>]*>|<tr class="result[^>]*>/i).slice(1)
  for (const block of blocks) {
    const titleMatch = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i)
      || block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
      || block.match(/<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i)
    results.push(makeRef(titleMatch[2], titleMatch[1], snippetMatch?.[1] || '', provider, query))
  }
  return compactReferences(results, MAX_TAB_REFERENCES)
}

async function searchBaiduWeb(query) {
  const rows = []
  const encoded = encodeURIComponent(query)
  const jobs = [
    { provider: 'baidu', url: `https://www.baidu.com/s?wd=${encoded}&rn=10&ie=utf-8`, referer: 'https://www.baidu.com/' },
    { provider: 'baidu_mobile', url: `https://m.baidu.com/s?word=${encoded}&rn=10&ie=utf-8`, referer: 'https://m.baidu.com/' },
  ]
  for (const job of jobs) {
    try {
      const html = await requestRaw(job.url, { headers: headers({ Referer: job.referer }) })
      rows.push(...parseBaidu(html, query, job.provider))
      if (rows.length >= 6) break
    } catch (error) {
      console.log(`${job.provider} failed`, query, error?.message || error)
    }
  }
  return compactReferences(rows, MAX_TAB_REFERENCES)
}

async function searchBaiduImages(query) {
  const rows = []
  const encoded = encodeURIComponent(query)
  const urls = [
    `https://image.baidu.com/search/acjson?tn=resultjson_com&ipn=rj&word=${encoded}&queryWord=${encoded}&pn=0&rn=20&ie=utf-8&oe=utf-8`,
    `https://image.baidu.com/search/acjson?tn=resultjson_com&ipn=rj&word=${encoded}%20高清图片谱&queryWord=${encoded}%20高清图片谱&pn=0&rn=20&ie=utf-8&oe=utf-8`,
  ]
  for (const url of urls) {
    try {
      const data = await requestJson(url, { headers: headers({ Referer: 'https://image.baidu.com/' }) })
      ;(data.data || []).forEach((item) => {
        const title = item.fromPageTitleEnc || item.fromPageTitle || item.title || `${query} 图片谱`
        const pageUrl = item.fromURL || item.fromUrl || item.objURL || item.hoverURL || item.middleURL || ''
        const thumb = item.thumbURL || item.thumbnailUrl || item.middleURL || item.objURL || ''
        const imageUrl = item.objURL || item.middleURL || item.hoverURL || thumb
        const sourceSite = item.fromPageTitleEnc ? stripHtml(item.fromPageTitleEnc) : parseHost(pageUrl)
        if (!thumb && !imageUrl) return
        rows.push(makeRef(title, pageUrl || imageUrl, '百度图片搜索到的吉他谱/图片谱缩略图，可作为谱源线索。', 'baidu_image', query, {
          result_type: 'image',
          thumbnail_url: thumb,
          image_url: imageUrl,
          source_site: sourceSite,
          scoreBoost: 22,
        }))
      })
      if (rows.length >= 6) break
    } catch (error) {
      console.log('baidu image failed', query, error?.message || error)
    }
  }
  return compactReferences(rows, 8)
}

async function searchOtherWeb(query) {
  const jobs = [
    { provider: 'bing', url: `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-CN&mkt=zh-CN`, referer: 'https://www.bing.com/' },
    { provider: 'sogou', url: `https://www.sogou.com/web?query=${encodeURIComponent(query)}`, referer: 'https://www.sogou.com/' },
    { provider: 'duckduckgo', url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=cn-zh`, referer: 'https://duckduckgo.com/' },
  ]
  const settled = await Promise.allSettled(jobs.map(async (job) => {
    const html = await requestRaw(job.url, { headers: headers({ Referer: job.referer }) })
    return parseSimpleHtmlResults(html, query, job.provider)
  }))
  return compactReferences(settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []), MAX_TAB_REFERENCES)
}

async function searchOneQuery(query) {
  const [webRows, imageRows] = await Promise.all([searchBaiduWeb(query), searchBaiduImages(query)])
  const baiduRows = compactReferences([...imageRows, ...webRows], MAX_TAB_REFERENCES)
  if (baiduRows.length >= 7) return baiduRows
  const otherRows = await searchOtherWeb(query)
  return compactReferences([...baiduRows, ...otherRows], MAX_TAB_REFERENCES)
}

async function searchTabReferences(queryVariants = []) {
  const collected = []
  const debug = []
  for (const query of queryVariants.slice(0, 7)) {
    const rows = await searchOneQuery(query)
    collected.push(...rows)
    const compacted = compactReferences(collected, MAX_TAB_REFERENCES)
    collected.length = 0
    collected.push(...compacted)
    debug.push({
      query,
      found: rows.length,
      total: collected.length,
      imageFound: rows.filter((item) => item.result_type === 'image' || item.thumbnail_url).length,
      topProvider: collected[0]?.provider || '',
      topTitle: collected[0]?.title || '',
    })
    if (collected.length >= MAX_TAB_REFERENCES) break
  }
  return { references: compactReferences(collected, MAX_TAB_REFERENCES), debug }
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

function buildFallbackTabReferences(keyword = '') {
  const clean = normalizeKeyword(keyword) || keyword
  const query = `${clean} 吉他谱 和弦谱 弹唱谱 图片谱`
  return compactReferences([
    { title: `百度搜索：${clean} 吉他谱`, url: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, snippet: `打开百度继续检索《${clean}》吉他谱/和弦谱/弹唱谱。`, provider: 'baidu', result_type: 'fallback', tab_score: 50 },
    { title: `百度图片：${clean} 吉他谱`, url: `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(query)}`, snippet: `打开百度图片继续检索《${clean}》图片谱。`, provider: 'baidu_image', result_type: 'fallback', tab_score: 49 },
    { title: `Bing搜索：${clean} 吉他谱`, url: `https://cn.bing.com/search?q=${encodeURIComponent(query)}`, snippet: `打开 Bing 继续检索《${clean}》吉他谱。`, provider: 'bing', result_type: 'fallback', tab_score: 46 },
  ], MAX_TAB_REFERENCES)
}

function buildCandidate(keyword, tabReferences, provider, debug = []) {
  const clean = normalizeKeyword(keyword) || keyword
  const refs = tabReferences.length ? tabReferences : buildFallbackTabReferences(clean)
  const artist = KNOWN_ARTISTS[clean] || KNOWN_ARTISTS[clean.replace(/\s+/g, '')] || ''
  const hints = extractArrangementHints(refs)
  return {
    title: clean,
    artist,
    album: '',
    duration: 0,
    confidence: tabReferences.length ? 0.9 : 0.62,
    source: tabReferences.length ? 'baidu_web_image_search' : 'baidu_search_fallback',
    summary: tabReferences.length
      ? `已按百度搜索效果找到 ${refs.length} 条吉他谱线索，其中 ${hints.imageReferenceCount || 0} 条图片谱。`
      : '百度搜索未稳定拿到结果，已提供可直接打开的百度搜索入口。',
    references: refs.slice(0, MAX_RESULTS),
    tabReferences: refs,
    arrangementHints: hints,
    searchDebug: debug,
    provider,
  }
}

exports.main = async (event = {}) => {
  const action = event.action || 'tabLookup'
  const keyword = String(event.keyword || event.query || '').trim()
  const provider = event.provider || process.env.WEB_SEARCH_PROVIDER || 'baidu_first'
  if (!['songLookup', 'tabLookup'].includes(action)) return jsonResponse(400, `Unknown action: ${action}`)
  if (!keyword) return jsonResponse(400, '请输入要搜索的歌曲关键词')
  const cleanKeyword = normalizeKeyword(keyword) || keyword
  const tabQueryVariants = buildTabQueryVariants(keyword)
  const cacheKey = `${action}:${provider}:${cleanKeyword.toLowerCase()}:${tabQueryVariants.join('|').toLowerCase()}`
  const cached = getCache(cacheKey)
  if (cached) return jsonResponse(0, cached)
  try {
    const { references, debug } = await searchTabReferences(tabQueryVariants)
    const candidate = buildCandidate(keyword, references, provider, debug)
    const response = {
      query: keyword,
      queryVariants: [cleanKeyword],
      tabQueryVariants,
      tabSearchEnabled: true,
      candidates: [candidate],
      canGenerate: true,
      provider,
      notice: '搜索结果仅展示公开网页/图片搜索的标题、摘要、缩略图和链接，不抓取、不复制第三方完整歌词或完整曲谱。',
      debug,
    }
    setCache(cacheKey, response)
    return jsonResponse(0, response)
  } catch (error) {
    console.error('web-search error:', error)
    return jsonResponse(500, error?.message || '网络搜索失败')
  }
}
