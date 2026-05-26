const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const songs = db.collection('songs')
const users = db.collection('users')

const TIMEOUT_MS = 6000
const MAX_TEXT_BYTES = 900 * 1024
const MAX_RAW_TEXT = 18000

const CHORD_RE = /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:\/[A-G](?:#|b)?)?$/i
const CHORD_IN_LINE_RE = /\b[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:\/[A-G](?:#|b)?)?\b/g
const SECTION_RE = /^(?:\[)?\s*(前奏|主歌|副歌|间奏|尾奏|桥段|intro|verse|chorus|bridge|outro|pre-chorus|solo)\s*(?:\])?[:：]?$/i

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
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
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

function headers(url = '') {
  let referer = 'https://www.baidu.com/'
  try {
    const parsed = new URL(url)
    referer = `${parsed.protocol}//${parsed.hostname}/`
  } catch (_error) {}
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Accept': 'text/html,text/plain,application/xhtml+xml,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    Referer: referer,
  }
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === 'http:' ? require('http') : require('https')
    const chunks = []
    let total = 0
    const req = transport.request({
      method: 'GET',
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      headers: headers(url),
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume()
        const nextUrl = new URL(res.headers.location, url).toString()
        requestText(nextUrl).then(resolve).catch(reject)
        return
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume()
        reject(new Error(`网页请求失败：${res.statusCode}`))
        return
      }
      res.on('data', (chunk) => {
        total += chunk.length
        if (total > MAX_TEXT_BYTES) {
          req.destroy(new Error('文本资源过大'))
          return
        }
        chunks.push(chunk)
      })
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('文本资源拉取超时')))
    req.on('error', reject)
    req.end()
  })
}

function normalizeSearchQuery(text = '') {
  return stripHtml(text)
    .replace(/百度图片[:：]?|百度搜索[:：]?|Bing搜索[:：]?/g, ' ')
    .replace(/搜索入口|图片谱|网页谱|TXT谱|吉他谱资源/g, ' ')
    .replace(/[《》【】\[\]（）()]/g, ' ')
    .replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ')
    .trim()
}

function inferSearchQuery(event = {}) {
  if (event.search_query) return normalizeSearchQuery(event.search_query)
  if (event.title) return normalizeSearchQuery(event.title)
  const url = safeUrl(event.url || '')
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return normalizeSearchQuery(parsed.searchParams.get('wd') || parsed.searchParams.get('word') || parsed.searchParams.get('q') || '')
  } catch (_error) {
    return ''
  }
}

function isChordLine(line = '') {
  const clean = line.trim().replace(/[|｜]/g, ' ')
  if (!clean || clean.length > 120) return false
  const tokens = clean.split(/\s+/).filter(Boolean)
  if (!tokens.length) return false
  const chordHits = tokens.filter((token) => CHORD_RE.test(token.replace(/[，,。.;；:：]/g, ''))).length
  const ratio = chordHits / tokens.length
  return chordHits >= 2 && ratio >= 0.45
}

function chordListFromText(text = '') {
  return Array.from(new Set((text.match(CHORD_IN_LINE_RE) || []).filter((item) => CHORD_RE.test(item)))).slice(0, 20)
}

function parseSongMeta(rawText = '', event = {}) {
  const sourceTitle = normalizeSearchQuery(event.song_title || event.title || event.search_query || '')
  let title = sourceTitle.replace(/吉他谱|和弦谱|弹唱谱|六线谱|高清图片谱/g, ' ').trim()
  let artist = String(event.artist || '').trim()
  const text = rawText.slice(0, 3000)

  const titlePatterns = [
    /《([^》]{1,60})》\s*(?:吉他谱|和弦谱|弹唱谱)?/,
    /歌曲[:：]\s*([^\n]{1,60})/,
    /歌名[:：]\s*([^\n]{1,60})/,
    /曲名[:：]\s*([^\n]{1,60})/,
  ]
  for (const pattern of titlePatterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      title = stripHtml(match[1]).replace(/吉他谱|和弦谱|弹唱谱|六线谱/g, '').trim()
      break
    }
  }

  const artistPatterns = [/歌手[:：]\s*([^\n\s]{1,40})/, /艺人[:：]\s*([^\n\s]{1,40})/, /演唱[:：]\s*([^\n\s]{1,40})/]
  for (const pattern of artistPatterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      artist = stripHtml(match[1]).trim()
      break
    }
  }

  return {
    title: title || '网络吉他谱',
    artist_name: artist,
  }
}

function parseRawTab(rawText = '') {
  const source = rawText
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .slice(0, 500)

  const sections = []
  let current = { name: '正文', lines: [] }
  let pendingChord = ''
  let chordLineCount = 0

  source.forEach((line) => {
    const trimmed = line.trim()
    const sectionMatch = trimmed.match(SECTION_RE)
    if (sectionMatch) {
      if (current.lines.length) sections.push(current)
      current = { name: sectionMatch[1], lines: [] }
      pendingChord = ''
      return
    }

    if (isChordLine(trimmed)) {
      pendingChord = trimmed
      chordLineCount += 1
      return
    }

    const looksLikeMeta = /^(歌手|曲谱|来源|原调|选调|变调夹|节拍|难度|Capo|Key|BPM)[:：]/i.test(trimmed)
    if (looksLikeMeta && current.lines.length === 0) return

    current.lines.push({
      chordLine: pendingChord || '',
      lyricLine: trimmed,
    })
    pendingChord = ''
  })

  if (current.lines.length) sections.push(current)

  const chords = chordListFromText(rawText)
  return {
    sections: sections.length ? sections : [{ name: '正文', lines: [{ chordLine: '', lyricLine: rawText.slice(0, 600) || '暂无可解析文本谱' }] }],
    chords,
    chordLineCount,
  }
}

function pickTextCandidateFromHtml(html = '') {
  const candidates = []
  const preMatches = Array.from(html.matchAll(/<(pre|textarea)[^>]*>([\s\S]*?)<\/\1>/gi)).map((m) => stripHtml(m[2]))
  candidates.push(...preMatches)

  const contentBlocks = Array.from(html.matchAll(/<div[^>]+class=(['"])[^'"]*(?:content|article|tab|chord|post|main|entry)[^'"]*\1[^>]*>([\s\S]{300,120000}?)<\/div>/gi)).map((m) => stripHtml(m[2]))
  candidates.push(...contentBlocks)

  candidates.push(stripHtml(html))

  return candidates
    .map((text) => text.replace(/\n{3,}/g, '\n\n').trim())
    .filter((text) => text.length >= 120)
    .sort((a, b) => {
      const score = (textScore(b) - textScore(a)) || (b.length - a.length)
      return score
    })[0] || ''
}

function textScore(text = '') {
  const lines = text.split('\n').slice(0, 300)
  const chordLines = lines.filter(isChordLine).length
  const chordCount = chordListFromText(text).length
  const tabWords = /吉他谱|和弦谱|弹唱谱|变调夹|原调|选调|Capo|Key/i.test(text) ? 20 : 0
  return chordLines * 20 + chordCount * 4 + tabWords
}

async function searchBaiduTextPage(searchQuery = '') {
  const q = normalizeSearchQuery(searchQuery)
  if (!q) throw new Error('缺少文本谱搜索词')
  const query = /吉他谱|和弦谱|弹唱谱/.test(q) ? q : `${q} 吉他谱 和弦谱 文本`
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=8&ie=utf-8`
  const html = await requestText(url)
  const links = []
  const blockRegex = /<h3[^>]*>[\s\S]*?<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/gi
  let match
  while ((match = blockRegex.exec(html)) && links.length < 5) {
    const title = stripHtml(match[3])
    const href = safeUrl(match[2])
    if (!href) continue
    if (!/吉他谱|和弦谱|弹唱谱|六线谱|chord|tab/i.test(title)) continue
    links.push({ title, url: href })
  }
  if (!links.length) throw new Error('没有找到文本谱网页')
  return links
}

async function resolveTextSource(event = {}) {
  const directText = String(event.raw_text || '').trim()
  if (directText) return { rawText: directText, sourceUrl: event.url || '', pageTitle: event.title || '文本谱' }

  const url = safeUrl(event.url || '')
  if (url && !url.includes('baidu.com/s?') && !url.includes('image.baidu.com')) {
    const html = await requestText(url)
    const text = pickTextCandidateFromHtml(html)
    if (textScore(text) >= 25) return { rawText: text, sourceUrl: url, pageTitle: event.title || '网络文本谱' }
  }

  const query = inferSearchQuery(event)
  const links = await searchBaiduTextPage(query)
  let best = null
  for (const link of links) {
    try {
      const html = await requestText(link.url)
      const text = pickTextCandidateFromHtml(html)
      const score = textScore(text)
      if (!best || score > best.score) best = { rawText: text, sourceUrl: link.url, pageTitle: link.title, score }
      if (score >= 80) break
    } catch (error) {
      console.log('candidate text page failed', error?.message || error)
    }
  }

  if (!best || best.score < 25) throw new Error('没有找到可解析的TXT/网页文本谱')
  return best
}

function buildSearchKeywords(title = '', artist = '') {
  return Array.from(new Set([
    title,
    artist,
    `${title} ${artist}`.trim(),
    `${title} 吉他谱`,
    `${title} 和弦谱`,
    `${title} 弹唱谱`,
    `${title} txt`,
  ].filter(Boolean)))
}

async function getCurrentUser(openid) {
  const result = await users.where({ openid }).limit(1).get()
  return result.data?.[0] || null
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || 'debug-openid'
  const now = new Date()

  try {
    const source = await resolveTextSource(event)
    const rawText = String(source.rawText || '').slice(0, MAX_RAW_TEXT)
    const parsed = parseRawTab(rawText)
    if (parsed.chordLineCount < 1 && parsed.chords.length < 3) {
      return jsonResponse(422, '找到了网页，但没有解析出足够的和弦文本谱')
    }

    const meta = parseSongMeta(rawText, event)
    const user = await getCurrentUser(openid)
    const data = {
      user_openid: openid,
      user_id: user?._id || '',
      title: String(meta.title || event.song_title || '网络文本谱').slice(0, 100),
      artist_name: String(meta.artist_name || event.artist || '').slice(0, 80),
      style: '弹唱',
      song_key: event.song_key || parsed.chords[0] || 'C',
      bpm: null,
      capo: event.capo || '0品',
      difficulty: '新手',
      strumming: '',
      tags: ['网络文本谱', 'TXT谱', '个人练习'],
      aliases: [],
      raw_text: rawText,
      content_json: {
        sections: parsed.sections,
        chords: parsed.chords,
        practiceTips: ['先按原网页文本谱慢速对照练习', '遇到不准的和弦可手动调整', '该谱来自公开网页解析，仅供个人练习参考'],
        sourceUrl: source.sourceUrl,
        sourceTitle: source.pageTitle,
        importNotice: '公开网页文本谱解析结果，仅供个人练习参考。',
      },
      source_type: 'web_txt',
      edit_mode: 'web_import',
      has_tab: true,
      is_public: false,
      visibility: 'private',
      audit_status: 'private',
      favorite_count: 0,
      like_count: 0,
      comment_count: 0,
      view_count: 0,
      practice_count: 0,
      created_at: now,
      updated_at: now,
    }
    data.search_keywords = buildSearchKeywords(data.title, data.artist_name)
    data.search_fingerprint = `${data.title} ${data.artist_name}`.trim().toLowerCase()
    data.search_text = data.search_keywords.join(' ').toLowerCase()

    const result = await songs.add({ data })
    return jsonResponse(0, {
      songId: result._id,
      title: data.title,
      artist_name: data.artist_name,
      sourceUrl: source.sourceUrl,
      sections: parsed.sections.length,
      chords: parsed.chords,
      message: '已导入为小程序内置吉他谱详情',
    })
  } catch (error) {
    console.error('resource-tab-import error:', error)
    return jsonResponse(500, error?.message || '文本谱导入失败')
  }
}
