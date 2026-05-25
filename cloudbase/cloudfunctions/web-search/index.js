const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEFAULT_TIMEOUT_MS = 6500
const MAX_RESULTS = 5

function jsonResponse(code, dataOrMessage) {
  if (code === 0) return { code, data: dataOrMessage }
  return { code, message: dataOrMessage }
}

function normalizeKeyword(keyword = '') {
  return String(keyword || '')
    .replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripHtml(text = '') {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeUrl(url = '') {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString()
  } catch (_error) {
    return ''
  }
}

function requestJson(url, options = {}) {
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
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          raw += chunk
          if (raw.length > 800000) req.destroy(new Error('response too large'))
        })
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`search provider status ${res.statusCode}`))
            return
          }
          try {
            resolve(JSON.parse(raw || '{}'))
          } catch (error) {
            reject(error)
          }
        })
      }
    )

    req.on('timeout', () => req.destroy(new Error('search provider timeout')))
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

function pickArtist(text = '') {
  const source = stripHtml(text)
  const patterns = [
    /歌手[:：]\s*([^\s，。|｜-]+)/,
    /艺人[:：]\s*([^\s，。|｜-]+)/,
    /演唱[:：]\s*([^\s，。|｜-]+)/,
    /([^\s，。|｜-]{2,12})\s*[｜|-]\s*.*?(?:吉他谱|歌词|歌曲)/,
  ]
  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

function buildCandidate(query, references = []) {
  const cleanQuery = normalizeKeyword(query)
  const first = references[0] || {}
  const mergedText = [first.title, first.snippet, references.map((item) => item.title).join(' ')]
    .filter(Boolean)
    .join(' ')

  const title = cleanQuery || stripHtml(first.title || query).replace(/吉他谱|歌词|歌曲|和弦谱/g, '').trim()
  const artist = pickArtist(mergedText)
  const confidence = references.length >= 3 ? 0.82 : references.length === 2 ? 0.72 : references.length ? 0.62 : 0

  return {
    title: title || query,
    artist,
    confidence,
    source: 'web',
    summary: references.length
      ? `网络中找到 ${references.length} 条相关音乐资料，可生成 AI 简化弹唱编配版。`
      : '暂未找到足够可靠的网络资料。',
    references,
  }
}

async function searchWithTavily(query) {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return null

  const payload = JSON.stringify({
    query,
    search_depth: 'basic',
    max_results: MAX_RESULTS,
    include_answer: true,
    include_raw_content: false,
  })

  const data = await requestJson('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(payload),
    },
    body: payload,
  })

  const references = (data.results || []).slice(0, MAX_RESULTS).map((item) => ({
    title: stripHtml(item.title || ''),
    url: safeUrl(item.url || ''),
    snippet: stripHtml(item.content || item.snippet || ''),
  })).filter((item) => item.title && item.url)

  const candidate = buildCandidate(query, references)
  if (data.answer) candidate.summary = stripHtml(data.answer).slice(0, 180)
  return candidate
}

async function searchWithBrave(query) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return null

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${MAX_RESULTS}&search_lang=zh-hans&country=CN`
  const data = await requestJson(url, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey,
    },
  })

  const references = (data.web?.results || []).slice(0, MAX_RESULTS).map((item) => ({
    title: stripHtml(item.title || ''),
    url: safeUrl(item.url || ''),
    snippet: stripHtml(item.description || ''),
  })).filter((item) => item.title && item.url)

  return buildCandidate(query, references)
}

function fallbackCandidate(query) {
  const cleanQuery = normalizeKeyword(query)
  return {
    title: cleanQuery || query,
    artist: '',
    confidence: 0.35,
    source: 'keyword',
    summary: '当前未配置网络搜索密钥或搜索服务不可用，可根据歌名生成 AI 简化弹唱编配版。',
    references: [],
  }
}

exports.main = async (event = {}) => {
  const action = event.action || 'songLookup'
  const keyword = String(event.keyword || event.query || '').trim()

  if (action !== 'songLookup') return jsonResponse(400, `Unknown action: ${action}`)
  if (!keyword) return jsonResponse(400, '请输入要搜索的歌曲关键词')

  const query = `${normalizeKeyword(keyword) || keyword} 歌曲 歌手 吉他弹唱 和弦`.trim()

  try {
    const provider = event.provider || process.env.WEB_SEARCH_PROVIDER || 'auto'
    let candidate = null

    if (provider === 'tavily' || provider === 'auto') candidate = await searchWithTavily(query).catch(() => null)
    if (!candidate && (provider === 'brave' || provider === 'auto')) candidate = await searchWithBrave(query).catch(() => null)
    if (!candidate) candidate = fallbackCandidate(keyword)

    return jsonResponse(0, {
      query: keyword,
      candidates: candidate.references.length || candidate.source === 'keyword' ? [candidate] : [],
      canGenerate: true,
      notice: '搜索结果仅用于识别歌曲与生成 AI 简化弹唱编配，不复制第三方完整歌词或曲谱。',
    })
  } catch (error) {
    console.error('web-search error:', error)
    return jsonResponse(500, error?.message || '网络搜索失败')
  }
}
