const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEFAULT_TIMEOUT_MS = 6500
const MAX_RESULTS = 8
const MAX_QUERY_VARIANTS = 5
const MAX_TAB_REFERENCES = 8
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const USER_AGENT = process.env.MUSICBRAINZ_USER_AGENT || 'PulingAI/1.0 (mini-weixinapp; contact: cloudbase)'
const DDG_USER_AGENT = process.env.DDG_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const DDG_HTML_ENDPOINT = process.env.DDG_HTML_ENDPOINT || 'https://html.duckduckgo.com/html/'

const memoryCache = new Map()
let lastMusicBrainzAt = 0
let lastDuckDuckGoAt = 0

function jsonResponse(code, dataOrMessage) {
  if (code === 0) return { code, data: dataOrMessage }
  return { code, message: dataOrMessage }
}

function normalizeKeyword(keyword = '') {
  return String(keyword || '')
    .replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|歌词|歌曲|简谱|完整版|原版|简单版|教学|指弹|尤克里里/g, '')
    .replace(/[《》【】\[\]（）()]/g, ' ')
    .replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ')
    .trim()
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
  return decodeHtml(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeUrl(url = '') {
  try {
    let raw = decodeHtml(String(url || '')).trim()
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

function requestRaw(url, options = {}) {
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
          if (raw.length > 1200000) req.destroy(new Error('response too large'))
        })
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`search provider status ${res.statusCode}`))
            return
          }
          resolve(raw)
        })
      }
    )

    req.on('timeout', () => req.destroy(new Error('search provider timeout')))
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

async function requestJson(url, options = {}) {
  const raw = await requestRaw(url, options)
  return JSON.parse(raw || '{}')
}

function compactReferences(references = [], max = MAX_RESULTS) {
  const seen = new Set()
  return references
    .filter((item) => item && (item.title || item.url || item.snippet))
    .map((item) => ({
      title: stripHtml(item.title || '').slice(0, 120),
      url: safeUrl(item.url || ''),
      snippet: stripHtml(item.snippet || '').slice(0, 180),
      category: item.category || 'music_meta',
      provider: item.provider || item.source || '',
      tab_score: Number(item.tab_score || 0),
    }))
    .filter((item) => {
      const key = `${item.title}|${item.url}`
      if (seen.has(key)) return false
      seen.add(key)
      return item.title || item.url || item.snippet
    })
    .sort((a, b) => Number(b.tab_score || 0) - Number(a.tab_score || 0))
    .slice(0, max)
}

function buildQueryVariants(keyword) {
  const original = String(keyword || '').trim()
  const clean = normalizeKeyword(original) || original
  const variants = [
    clean,
    original,
    clean.replace(/\s+/g, ''),
    `${clean} 歌手`,
    `${clean} song`,
    `${clean} lyrics`,
    `${clean} chords`,
  ]

  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean))).slice(0, MAX_QUERY_VARIANTS)
}

function buildTabQueryVariants(keyword) {
  const original = String(keyword || '').trim()
  const clean = normalizeKeyword(original) || original
  const variants = [
    `${clean} 吉他谱`,
    `${clean} 和弦谱`,
    `${clean} 弹唱谱`,
    `${clean} 六线谱`,
    `${clean} chords`,
    `${clean} guitar chords`,
    `${clean} guitar tab`,
    `${clean} tab`,
  ]
  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean))).slice(0, MAX_QUERY_VARIANTS)
}

function scoreByKeyword(keyword, title, artist = '') {
  const clean = normalizeKeyword(keyword).toLowerCase()
  const text = `${title || ''} ${artist || ''}`.toLowerCase()
  if (!clean || !text) return 0.56
  if (text.includes(clean)) return 0.92
  const tokens = clean.split(/[\s/·,，、-]+/).filter(Boolean)
  const hit = tokens.filter((token) => text.includes(token)).length
  return Math.min(0.88, 0.52 + hit * 0.12)
}

function isTabLikeReference(reference = {}) {
  const text = `${reference.title || ''} ${reference.snippet || ''}`.toLowerCase()
  return /吉他谱|和弦谱|弹唱谱|六线谱|gtp|guitar|chord|chords|tab|tabs|ukulele|尤克里里|变调夹|capo/.test(text)
}

function scoreTabReference(reference = {}, keyword = '') {
  const text = `${reference.title || ''} ${reference.snippet || ''}`.toLowerCase()
  const clean = normalizeKeyword(keyword).toLowerCase()
  let score = 0
  if (isTabLikeReference(reference)) score += 45
  if (/吉他谱|和弦谱|弹唱谱|六线谱/.test(text)) score += 28
  if (/chords|guitar chords|guitar tab|tabs/.test(text)) score += 18
  if (/变调夹|capo|c调|g调|d调|原调|选调/.test(text)) score += 16
  if (/c\s+g\s+am\s+f|c-g-am-f|g\s+d\s+em\s+c/.test(text)) score += 12
  if (clean && text.includes(clean)) score += 25
  return score
}

function extractArrangementHints(references = []) {
  const text = references.map((item) => `${item.title || ''} ${item.snippet || ''}`).join(' ')
  const keyMatches = Array.from(text.matchAll(/([A-G](?:#|b)?|[CDEFGAB]|[降升]?[A-G]|[1-7])\s*(?:调|key)/gi))
    .map((match) => match[0].replace(/\s+/g, ''))
  const capoMatches = Array.from(text.matchAll(/(?:变调夹|capo)\s*[:：]?\s*([0-9一二三四五六七八九十]+)\s*(?:品|fret)?/gi))
    .map((match) => `变调夹${match[1]}品`)
  const chordMatches = Array.from(text.matchAll(/\b[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus)?(?:2|4|5|6|7|9|11|13)?\b/g))
    .map((match) => match[0])
    .filter((item) => !['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(item) || text.includes(`${item} `))

  return {
    possibleKeys: Array.from(new Set(keyMatches)).slice(0, 4),
    possibleCapos: Array.from(new Set(capoMatches)).slice(0, 4),
    possibleChords: Array.from(new Set(chordMatches)).slice(0, 10),
    tabReferenceCount: references.filter(isTabLikeReference).length,
  }
}

function mergeHints(a = {}, b = {}) {
  return {
    possibleKeys: Array.from(new Set([...(a.possibleKeys || []), ...(b.possibleKeys || [])])).slice(0, 4),
    possibleCapos: Array.from(new Set([...(a.possibleCapos || []), ...(b.possibleCapos || [])])).slice(0, 4),
    possibleChords: Array.from(new Set([...(a.possibleChords || []), ...(b.possibleChords || [])])).slice(0, 10),
    tabReferenceCount: Number(a.tabReferenceCount || 0) + Number(b.tabReferenceCount || 0),
  }
}

function mergeCandidates(candidates = []) {
  const map = new Map()

  candidates.forEach((candidate) => {
    if (!candidate?.title) return
    const key = `${candidate.title}|${candidate.artist || ''}`.toLowerCase()
    const existed = map.get(key)
    if (!existed) {
      map.set(key, {
        ...candidate,
        references: compactReferences(candidate.references || []),
        tabReferences: compactReferences(candidate.tabReferences || [], MAX_TAB_REFERENCES),
        arrangementHints: candidate.arrangementHints || extractArrangementHints([...(candidate.references || []), ...(candidate.tabReferences || [])]),
        providers: candidate.providers || [candidate.source].filter(Boolean),
      })
      return
    }

    existed.confidence = Math.max(existed.confidence || 0, candidate.confidence || 0)
    existed.album = existed.album || candidate.album
    existed.duration = existed.duration || candidate.duration
    existed.summary = existed.summary || candidate.summary
    existed.references = compactReferences([...(existed.references || []), ...(candidate.references || [])])
    existed.tabReferences = compactReferences([...(existed.tabReferences || []), ...(candidate.tabReferences || [])], MAX_TAB_REFERENCES)
    existed.arrangementHints = mergeHints(existed.arrangementHints, candidate.arrangementHints || extractArrangementHints([...(candidate.references || []), ...(candidate.tabReferences || [])]))
    existed.providers = Array.from(new Set([...(existed.providers || []), candidate.source].filter(Boolean)))
    existed.source = existed.providers.join('+')
  })

  return Array.from(map.values())
    .map((candidate) => ({
      ...candidate,
      confidence: Math.min(0.96, Number(candidate.confidence || 0) + Math.min(0.08, (candidate.tabReferences || []).length * 0.012)),
    }))
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    .slice(0, MAX_RESULTS)
}

async function searchMusicBrainz(keyword, originalKeyword = keyword) {
  const cleanKeyword = normalizeKeyword(keyword) || keyword
  const now = Date.now()
  const wait = Math.max(0, 1100 - (now - lastMusicBrainzAt))
  if (wait) await sleep(wait)
  lastMusicBrainzAt = Date.now()

  const query = encodeURIComponent(cleanKeyword)
  const url = `https://musicbrainz.org/ws/2/recording/?query=${query}&fmt=json&limit=${MAX_RESULTS}`
  const data = await requestJson(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': USER_AGENT,
    },
  })

  return (data.recordings || [])
    .map((item) => {
      const artist = (item['artist-credit'] || [])
        .map((credit) => credit?.artist?.name || credit?.name || '')
        .filter(Boolean)
        .join(' / ')
      const firstRelease = item.releases?.[0] || {}
      const title = stripHtml(item.title || cleanKeyword)
      const confidence = scoreByKeyword(originalKeyword, title, artist)
      const urlId = item.id ? `https://musicbrainz.org/recording/${item.id}` : 'https://musicbrainz.org/'

      return {
        title,
        artist,
        album: firstRelease.title || '',
        duration: item.length || 0,
        confidence,
        source: 'musicbrainz',
        summary: `MusicBrainz 识别到《${title}》${artist ? ` - ${artist}` : ''}${firstRelease.title ? `，收录于《${firstRelease.title}》` : ''}。可生成 AI 简化弹唱编配版。`,
        references: compactReferences([
          {
            title: `MusicBrainz：${title}${artist ? ` - ${artist}` : ''}`,
            url: urlId,
            snippet: firstRelease.title ? `专辑/发行：${firstRelease.title}` : '开放音乐元数据来源。',
            category: 'music_meta',
            provider: 'musicbrainz',
          },
        ]),
      }
    })
    .filter((item) => item.title)
}

async function searchItunes(keyword, originalKeyword = keyword) {
  const cleanKeyword = normalizeKeyword(keyword) || keyword
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanKeyword)}&media=music&entity=song&country=CN&limit=${MAX_RESULTS}`
  const data = await requestJson(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': USER_AGENT,
    },
  })

  return (data.results || [])
    .map((item) => {
      const title = stripHtml(item.trackName || cleanKeyword)
      const artist = stripHtml(item.artistName || '')
      const album = stripHtml(item.collectionName || '')
      const confidence = scoreByKeyword(originalKeyword, title, artist)

      return {
        title,
        artist,
        album,
        duration: item.trackTimeMillis || 0,
        confidence,
        source: 'itunes',
        summary: `iTunes 识别到《${title}》${artist ? ` - ${artist}` : ''}${album ? `，收录于《${album}》` : ''}。可生成 AI 简化弹唱编配版。`,
        references: compactReferences([
          {
            title: `iTunes：${title}${artist ? ` - ${artist}` : ''}`,
            url: item.trackViewUrl || item.collectionViewUrl || '',
            snippet: album ? `专辑：${album}` : '公开音乐元数据来源。',
            category: 'music_meta',
            provider: 'itunes',
          },
        ]),
      }
    })
    .filter((item) => item.title)
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

function buildWebCandidate(query, references = [], source = 'web') {
  const cleanQuery = normalizeKeyword(query)
  const first = references[0] || {}
  const mergedText = [first.title, first.snippet, references.map((item) => item.title).join(' ')]
    .filter(Boolean)
    .join(' ')

  const title = cleanQuery || stripHtml(first.title || query).replace(/吉他谱|歌词|歌曲|和弦谱/g, '').trim()
  const artist = pickArtist(mergedText)
  const tabReferences = compactReferences(references.filter(isTabLikeReference), MAX_TAB_REFERENCES)
  const confidence = references.length >= 3 ? 0.82 : references.length === 2 ? 0.72 : references.length ? 0.62 : 0

  return {
    title: title || query,
    artist,
    confidence,
    source,
    summary: tabReferences.length
      ? `网络中找到 ${tabReferences.length} 条吉他谱/和弦谱线索，可生成 AI 简化弹唱编配版。`
      : references.length ? `网络中找到 ${references.length} 条相关音乐资料，可生成 AI 简化弹唱编配版。` : '暂未找到足够可靠的网络资料。',
    references: compactReferences(references),
    tabReferences,
    arrangementHints: extractArrangementHints(references),
  }
}

function parseDuckDuckGoHtml(html = '', query = '', category = 'tab_reference') {
  const results = []
  const blocks = html.split(/<div class="result results_links[^>]*>|<div class="web-result[^>]*>/i).slice(1)

  blocks.forEach((block) => {
    const titleMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i)
    if (!titleMatch) return

    const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i)
      || block.match(/<span[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/span>/i)

    const ref = {
      title: stripHtml(titleMatch[2]),
      url: safeUrl(titleMatch[1]),
      snippet: stripHtml(snippetMatch?.[1] || ''),
      category,
      provider: 'duckduckgo',
    }
    ref.tab_score = scoreTabReference(ref, query)
    if (ref.title && ref.url) results.push(ref)
  })

  if (results.length) return compactReferences(results, MAX_RESULTS)

  const anchorRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = anchorRegex.exec(html)) && results.length < MAX_RESULTS) {
    const ref = {
      title: stripHtml(match[2]),
      url: safeUrl(match[1]),
      snippet: '',
      category,
      provider: 'duckduckgo',
    }
    ref.tab_score = scoreTabReference(ref, query)
    if (ref.title && ref.url) results.push(ref)
  }

  return compactReferences(results, MAX_RESULTS)
}

async function searchWithDuckDuckGo(query, category = 'tab_reference') {
  const now = Date.now()
  const wait = Math.max(0, 850 - (now - lastDuckDuckGoAt))
  if (wait) await sleep(wait)
  lastDuckDuckGoAt = Date.now()

  const url = `${DDG_HTML_ENDPOINT}?q=${encodeURIComponent(query)}&kl=cn-zh`
  const html = await requestRaw(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.7',
      'User-Agent': DDG_USER_AGENT,
    },
  })

  const references = parseDuckDuckGoHtml(html, query, category)
  const candidate = buildWebCandidate(query, references, category === 'tab_reference' ? 'duckduckgo_tab' : 'duckduckgo')
  return candidate.references.length ? [candidate] : []
}

async function searchWithTavily(query, category = 'music_meta') {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []

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

  const references = (data.results || []).slice(0, MAX_RESULTS).map((item) => {
    const ref = {
      title: stripHtml(item.title || ''),
      url: safeUrl(item.url || ''),
      snippet: stripHtml(item.content || item.snippet || ''),
      category,
      provider: 'tavily',
    }
    ref.tab_score = scoreTabReference(ref, query)
    return ref
  }).filter((item) => item.title && item.url)

  const candidate = buildWebCandidate(query, references, category === 'tab_reference' ? 'tavily_tab' : 'tavily')
  if (data.answer && category !== 'tab_reference') candidate.summary = stripHtml(data.answer).slice(0, 180)
  return candidate.references.length ? [candidate] : []
}

async function searchWithBrave(query, category = 'music_meta') {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${MAX_RESULTS}&search_lang=zh-hans&country=CN`
  const data = await requestJson(url, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey,
    },
  })

  const references = (data.web?.results || []).slice(0, MAX_RESULTS).map((item) => {
    const ref = {
      title: stripHtml(item.title || ''),
      url: safeUrl(item.url || ''),
      snippet: stripHtml(item.description || ''),
      category,
      provider: 'brave',
    }
    ref.tab_score = scoreTabReference(ref, query)
    return ref
  }).filter((item) => item.title && item.url)

  const candidate = buildWebCandidate(query, references, category === 'tab_reference' ? 'brave_tab' : 'brave')
  return candidate.references.length ? [candidate] : []
}

async function searchTabReferences(queryVariants = [], provider = 'auto') {
  const jobs = []
  const useDuckDuckGo = provider === 'open' || provider === 'auto' || provider === 'duckduckgo'
  if (useDuckDuckGo) {
    queryVariants.forEach((query) => jobs.push(searchWithDuckDuckGo(query, 'tab_reference').catch(() => [])))
  }
  if (provider === 'tavily' || provider === 'auto') {
    queryVariants.forEach((query) => jobs.push(searchWithTavily(query, 'tab_reference').catch(() => [])))
  }
  if (provider === 'brave' || provider === 'auto') {
    queryVariants.forEach((query) => jobs.push(searchWithBrave(query, 'tab_reference').catch(() => [])))
  }
  const candidates = (await Promise.all(jobs)).flat().flat()
  const references = compactReferences(candidates.flatMap((candidate) => [
    ...(candidate.tabReferences || []),
    ...(candidate.references || []).filter(isTabLikeReference),
  ]), MAX_TAB_REFERENCES)
  return references
}

function attachTabReferences(candidates = [], tabReferences = [], keyword = '') {
  if (!tabReferences.length) return candidates
  const hints = extractArrangementHints(tabReferences)

  if (!candidates.length) {
    const candidate = buildWebCandidate(keyword, tabReferences, 'tab_reference')
    return [{
      ...candidate,
      confidence: Math.max(candidate.confidence || 0, 0.62),
      tabReferences,
      arrangementHints: hints,
    }]
  }

  return candidates.map((candidate, index) => {
    if (index > 2) return candidate
    const mergedTabs = compactReferences([...(candidate.tabReferences || []), ...tabReferences], MAX_TAB_REFERENCES)
    const mergedHints = mergeHints(candidate.arrangementHints || {}, hints)
    return {
      ...candidate,
      source: Array.from(new Set([...(candidate.source || '').split('+').filter(Boolean), 'tab_reference'])).join('+'),
      confidence: Math.min(0.96, Number(candidate.confidence || 0) + Math.min(0.1, mergedTabs.length * 0.015)),
      tabReferences: mergedTabs,
      arrangementHints: mergedHints,
      summary: mergedTabs.length
        ? `${candidate.summary || ''} 已补充 ${mergedTabs.length} 条吉他谱/和弦谱搜索线索。`.trim()
        : candidate.summary,
    }
  })
}

function fallbackCandidate(query) {
  const cleanQuery = normalizeKeyword(query)
  return {
    title: cleanQuery || query,
    artist: '',
    album: '',
    duration: 0,
    confidence: 0.35,
    source: 'keyword',
    summary: '未找到明确音乐元数据，可根据输入关键词生成 AI 简化弹唱编配版。',
    references: [],
    tabReferences: [],
    arrangementHints: { possibleKeys: [], possibleCapos: [], possibleChords: [], tabReferenceCount: 0 },
  }
}

exports.main = async (event = {}) => {
  const action = event.action || 'songLookup'
  const keyword = String(event.keyword || event.query || '').trim()

  if (action !== 'songLookup') return jsonResponse(400, `Unknown action: ${action}`)
  if (!keyword) return jsonResponse(400, '请输入要搜索的歌曲关键词')

  const cleanKeyword = normalizeKeyword(keyword) || keyword
  const queryVariants = buildQueryVariants(keyword)
  const tabQueryVariants = buildTabQueryVariants(keyword)
  const cacheKey = `songLookup:${cleanKeyword.toLowerCase()}:${queryVariants.join('|').toLowerCase()}:${tabQueryVariants.join('|').toLowerCase()}`
  const cached = getCache(cacheKey)
  if (cached) return jsonResponse(0, cached)

  try {
    const provider = event.provider || process.env.WEB_SEARCH_PROVIDER || 'auto'
    let candidates = []
    let tabReferences = []
    const canSearchTabs = provider === 'open' || provider === 'auto' || provider === 'duckduckgo' || Boolean(process.env.TAVILY_API_KEY || process.env.BRAVE_SEARCH_API_KEY)

    if (provider === 'open' || provider === 'auto') {
      const itunesJobs = queryVariants.map((query) => searchItunes(query, cleanKeyword).catch((error) => {
        console.log('itunes search failed', query, error?.message || error)
        return []
      }))
      const itunesResults = (await Promise.all(itunesJobs)).flat()

      const musicBrainzResults = []
      for (const query of queryVariants.slice(0, 3)) {
        const result = await searchMusicBrainz(query, cleanKeyword).catch((error) => {
          console.log('musicbrainz search failed', query, error?.message || error)
          return []
        })
        musicBrainzResults.push(...result)
      }

      candidates = mergeCandidates([...itunesResults, ...musicBrainzResults])
    }

    if (canSearchTabs) {
      tabReferences = await searchTabReferences(tabQueryVariants, provider).catch((error) => {
        console.log('tab reference search failed', error?.message || error)
        return []
      })
      candidates = attachTabReferences(candidates, tabReferences, cleanKeyword)
    }

    if ((!candidates.length || provider === 'auto') && (provider === 'tavily' || provider === 'auto')) {
      const tavilyResults = await searchWithTavily(`${cleanKeyword} 歌曲 歌手 吉他弹唱`, 'music_meta').catch(() => [])
      candidates = mergeCandidates([...candidates, ...tavilyResults])
    }

    if ((!candidates.length || provider === 'auto') && (provider === 'brave' || provider === 'auto')) {
      const braveResults = await searchWithBrave(`${cleanKeyword} 歌曲 歌手 吉他弹唱`, 'music_meta').catch(() => [])
      candidates = mergeCandidates([...candidates, ...braveResults])
    }

    if (tabReferences.length) candidates = attachTabReferences(candidates, tabReferences, cleanKeyword)
    if (!candidates.length) candidates = [fallbackCandidate(keyword)]

    const response = {
      query: keyword,
      queryVariants,
      tabQueryVariants,
      tabSearchEnabled: canSearchTabs,
      candidates,
      canGenerate: true,
      provider,
      notice: '搜索结果仅用于识别歌曲与生成 AI 简化弹唱编配，不抓取、不复制第三方完整歌词或曲谱。',
    }

    setCache(cacheKey, response)
    return jsonResponse(0, response)
  } catch (error) {
    console.error('web-search error:', error)
    return jsonResponse(500, error?.message || '网络搜索失败')
  }
}
