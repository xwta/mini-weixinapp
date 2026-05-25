const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEFAULT_TIMEOUT_MS = 6500
const MAX_RESULTS = 5
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const USER_AGENT = process.env.MUSICBRAINZ_USER_AGENT || 'PulingAI/1.0 (mini-weixinapp; contact: cloudbase)'

const memoryCache = new Map()
let lastMusicBrainzAt = 0

function jsonResponse(code, dataOrMessage) {
  if (code === 0) return { code, data: dataOrMessage }
  return { code, message: dataOrMessage }
}

function normalizeKeyword(keyword = '') {
  return String(keyword || '')
    .replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|歌词|歌曲/g, '')
    .replace(/[《》]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripHtml(text = '') {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
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

function compactReferences(references = []) {
  const seen = new Set()
  return references
    .filter((item) => item && (item.title || item.url || item.snippet))
    .map((item) => ({
      title: stripHtml(item.title || '').slice(0, 120),
      url: safeUrl(item.url || ''),
      snippet: stripHtml(item.snippet || '').slice(0, 180),
    }))
    .filter((item) => {
      const key = `${item.title}|${item.url}`
      if (seen.has(key)) return false
      seen.add(key)
      return item.title || item.url || item.snippet
    })
    .slice(0, MAX_RESULTS)
}

function scoreByKeyword(keyword, title, artist = '') {
  const clean = normalizeKeyword(keyword).toLowerCase()
  const text = `${title || ''} ${artist || ''}`.toLowerCase()
  if (!clean || !text) return 0.56
  if (text.includes(clean)) return 0.9
  const tokens = clean.split(/[\s/·,，、-]+/).filter(Boolean)
  const hit = tokens.filter((token) => text.includes(token)).length
  return Math.min(0.86, 0.52 + hit * 0.12)
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
        providers: candidate.providers || [candidate.source].filter(Boolean),
      })
      return
    }

    existed.confidence = Math.max(existed.confidence || 0, candidate.confidence || 0)
    existed.album = existed.album || candidate.album
    existed.duration = existed.duration || candidate.duration
    existed.summary = existed.summary || candidate.summary
    existed.references = compactReferences([...(existed.references || []), ...(candidate.references || [])])
    existed.providers = Array.from(new Set([...(existed.providers || []), candidate.source].filter(Boolean)))
    existed.source = existed.providers.join('+')
  })

  return Array.from(map.values())
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    .slice(0, MAX_RESULTS)
}

async function searchMusicBrainz(keyword) {
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
      const confidence = scoreByKeyword(cleanKeyword, title, artist)
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
          },
        ]),
      }
    })
    .filter((item) => item.title)
}

async function searchItunes(keyword) {
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
      const confidence = scoreByKeyword(cleanKeyword, title, artist)

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
  const confidence = references.length >= 3 ? 0.82 : references.length === 2 ? 0.72 : references.length ? 0.62 : 0

  return {
    title: title || query,
    artist,
    confidence,
    source,
    summary: references.length
      ? `网络中找到 ${references.length} 条相关音乐资料，可生成 AI 简化弹唱编配版。`
      : '暂未找到足够可靠的网络资料。',
    references: compactReferences(references),
  }
}

async function searchWithTavily(query) {
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

  const references = (data.results || []).slice(0, MAX_RESULTS).map((item) => ({
    title: stripHtml(item.title || ''),
    url: safeUrl(item.url || ''),
    snippet: stripHtml(item.content || item.snippet || ''),
  })).filter((item) => item.title && item.url)

  const candidate = buildWebCandidate(query, references, 'tavily')
  if (data.answer) candidate.summary = stripHtml(data.answer).slice(0, 180)
  return candidate.references.length ? [candidate] : []
}

async function searchWithBrave(query) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []

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

  const candidate = buildWebCandidate(query, references, 'brave')
  return candidate.references.length ? [candidate] : []
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
  }
}

exports.main = async (event = {}) => {
  const action = event.action || 'songLookup'
  const keyword = String(event.keyword || event.query || '').trim()

  if (action !== 'songLookup') return jsonResponse(400, `Unknown action: ${action}`)
  if (!keyword) return jsonResponse(400, '请输入要搜索的歌曲关键词')

  const cleanKeyword = normalizeKeyword(keyword) || keyword
  const cacheKey = `songLookup:${cleanKeyword.toLowerCase()}`
  const cached = getCache(cacheKey)
  if (cached) return jsonResponse(0, cached)

  try {
    const provider = event.provider || process.env.WEB_SEARCH_PROVIDER || 'open'
    let candidates = []

    if (provider === 'open' || provider === 'auto') {
      const [musicBrainz, itunes] = await Promise.all([
        searchMusicBrainz(cleanKeyword).catch((error) => {
          console.log('musicbrainz search failed', error?.message || error)
          return []
        }),
        searchItunes(cleanKeyword).catch((error) => {
          console.log('itunes search failed', error?.message || error)
          return []
        }),
      ])
      candidates = mergeCandidates([...musicBrainz, ...itunes])
    }

    if (!candidates.length && (provider === 'tavily' || provider === 'auto')) {
      candidates = mergeCandidates(await searchWithTavily(`${cleanKeyword} 歌曲 歌手`).catch(() => []))
    }

    if (!candidates.length && (provider === 'brave' || provider === 'auto')) {
      candidates = mergeCandidates(await searchWithBrave(`${cleanKeyword} 歌曲 歌手`).catch(() => []))
    }

    if (!candidates.length) candidates = [fallbackCandidate(keyword)]

    const response = {
      query: keyword,
      candidates,
      canGenerate: true,
      provider,
      notice: '搜索结果仅用于识别歌曲与生成 AI 简化弹唱编配，不复制第三方完整歌词或曲谱。',
    }

    setCache(cacheKey, response)
    return jsonResponse(0, response)
  } catch (error) {
    console.error('web-search error:', error)
    return jsonResponse(500, error?.message || '网络搜索失败')
  }
}
