const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const songs = db.collection('songs')
const users = db.collection('users')

const TIMEOUT_MS = 5200
const TARGET_FETCH_BYTES = 360 * 1024
const MAX_RAW_TEXT = 18000

const CHORD_RE = /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:\/[A-G](?:#|b)?)?$/i
const CHORD_IN_LINE_RE = /\b[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:\/[A-G](?:#|b)?)?\b/g
const SECTION_RE = /^(?:\[)?\s*(前奏|主歌|副歌|间奏|尾奏|桥段|intro|verse|chorus|bridge|outro|pre-chorus|solo)\s*(?:\])?[:：]?$/i

const TRUSTED_TEXT_DOMAINS = [
  '52cmajor.com', 'iloveguitar.cn', 'jitatang.com', 'jita5.com', 'jitabang.com',
  '17jita.com', 'qupu123.com', 'jita123.com', 'cangqiang.com', 'tan8.com',
]

const BLOCKED_URL_RE = /(?:image\.baidu\.com|video|shipin|download|down|app|login|user|search\/index|\/search\?|\.pdf$|\.jpg$|\.jpeg$|\.png$|\.webp$|\.gif$)/i

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

function parseHost(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch (_error) {
    return ''
  }
}

function isTrustedDomain(url = '') {
  const host = parseHost(url)
  return TRUSTED_TEXT_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function assertImportableEvent(event = {}) {
  if (event.raw_text) return
  if (event.importable !== true || event.action_hint !== 'import') {
    throw new Error('该资源未通过转谱筛选')
  }
  const url = safeUrl(event.url || '')
  if (!url || BLOCKED_URL_RE.test(url)) throw new Error('该资源不适合转谱')
}

function headers(url = '', range = true) {
  let referer = 'https://www.baidu.com/'
  try {
    const parsed = new URL(url)
    referer = `${parsed.protocol}//${parsed.hostname}/`
  } catch (_error) {}
  const base = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Accept': 'text/html,text/plain,application/xhtml+xml,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    Referer: referer,
    Range: `bytes=0-${TARGET_FETCH_BYTES}`,
  }
  if (!range) delete base.Range
  return base
}

function requestTargetSlice(url, options = {}) {
  const byteLimit = options.byteLimit || TARGET_FETCH_BYTES
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === 'http:' ? require('http') : require('https')
    const chunks = []
    let total = 0
    let settled = false
    let req = null
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const fail = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    req = transport.request({
      method: 'GET',
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      headers: headers(url, options.range !== false),
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume()
        const nextUrl = new URL(res.headers.location, url).toString()
        requestTargetSlice(nextUrl, options).then(finish).catch(fail)
        return
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume()
        fail(new Error(`网页请求失败：${res.statusCode}`))
        return
      }
      res.on('data', (chunk) => {
        if (settled) return
        chunks.push(chunk)
        total += chunk.length
        if (total >= byteLimit) {
          finish(Buffer.concat(chunks).toString('utf8'))
          res.destroy()
        }
      })
      res.on('end', () => finish(Buffer.concat(chunks).toString('utf8')))
      res.on('error', (error) => {
        if (!settled && chunks.length) finish(Buffer.concat(chunks).toString('utf8'))
        else if (!settled) fail(error)
      })
    })
    req.setTimeout(TIMEOUT_MS, () => {
      const partial = chunks.length ? Buffer.concat(chunks).toString('utf8') : ''
      if (partial.length >= 1000) finish(partial)
      else req.destroy(new Error('目标资源拉取超时'))
    })
    req.on('error', (error) => {
      if (settled) return
      const partial = chunks.length ? Buffer.concat(chunks).toString('utf8') : ''
      if (partial.length >= 1000) finish(partial)
      else fail(error)
    })
    req.end()
  })
}

function normalizeSearchQuery(text = '') {
  return stripHtml(text)
    .replace(/百度图片[:：]?|百度搜索[:：]?|Bing搜索[:：]?/g, ' ')
    .replace(/搜索入口|图片谱|网页谱|TXT谱|文本谱|吉他谱资源/g, ' ')
    .replace(/[《》【】\[\]（）()]/g, ' ')
    .replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ')
    .trim()
}

function compactText(text = '') {
  return normalizeSearchQuery(text).replace(/吉他谱|和弦谱|弹唱谱|六线谱|高清|原版|图片/g, '').replace(/\s+/g, '').toLowerCase()
}

function inferSearchQuery(event = {}) {
  if (event.search_query) return normalizeSearchQuery(event.search_query)
  const composed = [event.song_title, event.artist, event.title].filter(Boolean).join(' ')
  if (composed) return normalizeSearchQuery(composed)
  return ''
}

function isChordLine(line = '') {
  const clean = line.trim().replace(/[|｜]/g, ' ')
  if (!clean || clean.length > 120) return false
  const tokens = clean.split(/\s+/).filter(Boolean)
  if (!tokens.length) return false
  const chordHits = tokens.filter((token) => CHORD_RE.test(token.replace(/[，,。.;；:：]/g, ''))).length
  return chordHits >= 2 && chordHits / tokens.length >= 0.45
}

function chordListFromText(text = '') {
  return Array.from(new Set((text.match(CHORD_IN_LINE_RE) || []).filter((item) => CHORD_RE.test(item)))).slice(0, 20)
}

function textScore(text = '', query = '') {
  const lines = text.split('\n').slice(0, 300)
  const chordLines = lines.filter(isChordLine).length
  const chordCount = chordListFromText(text).length
  const tabWords = /吉他谱|和弦谱|弹唱谱|变调夹|原调|选调|Capo|Key/i.test(text) ? 20 : 0
  const queryHit = compactText(query) && compactText(text).includes(compactText(query).slice(0, 12)) ? 22 : 0
  return chordLines * 22 + chordCount * 4 + tabWords + queryHit
}

function extractJsonLikeText(html = '') {
  const rows = []
  const scripts = Array.from(html.matchAll(/<script[^>]+type=(['"])(?:application\/ld\+json|application\/json)\1[^>]*>([\s\S]*?)<\/script>/gi))
  scripts.forEach((match) => rows.push(stripHtml(match[2])))
  const nextData = html.match(/<script[^>]+id=(['"])__NEXT_DATA__\1[^>]*>([\s\S]*?)<\/script>/i)
  if (nextData?.[2]) rows.push(stripHtml(nextData[2]))
  return rows.join('\n')
}

function keywordWindows(html = '', query = '') {
  const cleanQuery = compactText(query)
  const plain = stripHtml(html)
  const keys = Array.from(new Set([cleanQuery, '吉他谱', '和弦谱', '弹唱谱', '变调夹', 'Capo', '原调', '选调'].filter(Boolean)))
  const windows = []
  const compactPlain = compactText(plain)
  keys.forEach((key) => {
    const index = compactPlain.indexOf(String(key).slice(0, 10))
    if (index >= 0) windows.push(plain.slice(Math.max(0, index - 2600), Math.max(0, index - 2600) + 14000))
  })
  return windows
}

function pickTextCandidateFromHtml(html = '', query = '') {
  const candidates = []
  candidates.push(...Array.from(html.matchAll(/<(pre|textarea)[^>]*>([\s\S]*?)<\/\1>/gi)).map((m) => stripHtml(m[2])))
  candidates.push(...Array.from(html.matchAll(/<(?:article|main|section|div)[^>]+(?:class|id)=(['"])[^'"]*(?:content|article|tab|chord|post|main|entry|pu|info|detail)[^'"]*\1[^>]*>([\s\S]{200,70000}?)<\/(?:article|main|section|div)>/gi)).map((m) => stripHtml(m[2])))
  const jsonText = extractJsonLikeText(html)
  if (jsonText) candidates.push(jsonText.slice(0, 24000))
  candidates.push(...keywordWindows(html, query))
  return candidates
    .map((text) => text.replace(/\n{3,}/g, '\n\n').trim())
    .filter((text) => text.length >= 120)
    .sort((a, b) => (textScore(b, query) - textScore(a, query)) || (b.length - a.length))[0] || ''
}

function parseSongMeta(rawText = '', event = {}) {
  const sourceTitle = normalizeSearchQuery(event.song_title || event.title || event.search_query || '')
  let title = sourceTitle.replace(/吉他谱|和弦谱|弹唱谱|六线谱|高清图片谱/g, ' ').trim()
  let artist = String(event.artist || '').trim()
  const text = rawText.slice(0, 3000)
  for (const pattern of [/《([^》]{1,60})》\s*(?:吉他谱|和弦谱|弹唱谱)?/, /歌曲[:：]\s*([^\n]{1,60})/, /歌名[:：]\s*([^\n]{1,60})/, /曲名[:：]\s*([^\n]{1,60})/]) {
    const match = text.match(pattern)
    if (match?.[1]) {
      title = stripHtml(match[1]).replace(/吉他谱|和弦谱|弹唱谱|六线谱/g, '').trim()
      break
    }
  }
  for (const pattern of [/歌手[:：]\s*([^\n\s]{1,40})/, /艺人[:：]\s*([^\n\s]{1,40})/, /演唱[:：]\s*([^\n\s]{1,40})/]) {
    const match = text.match(pattern)
    if (match?.[1]) {
      artist = stripHtml(match[1]).trim()
      break
    }
  }
  return { title: title || '网络吉他谱', artist_name: artist }
}

function parseRawTab(rawText = '') {
  const source = rawText.replace(/\r/g, '').split('\n').map((line) => line.trimEnd()).filter((line) => line.trim()).slice(0, 500)
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
    current.lines.push({ chordLine: pendingChord || '', lyricLine: trimmed })
    pendingChord = ''
  })
  if (current.lines.length) sections.push(current)
  const chords = chordListFromText(rawText)
  return { sections: sections.length ? sections : [{ name: '正文', lines: [{ chordLine: '', lyricLine: rawText.slice(0, 600) || '暂无可解析文本谱' }] }], chords, chordLineCount }
}

async function tryExtractFromUrl(link = {}, event = {}) {
  const query = inferSearchQuery(event)
  const html = await requestTargetSlice(link.url, { byteLimit: isTrustedDomain(link.url) ? 420 * 1024 : TARGET_FETCH_BYTES })
  const text = pickTextCandidateFromHtml(html, query || link.title)
  const score = textScore(text, query || link.title)
  if (score < 34) throw new Error('目标页面未命中曲谱正文')
  return { rawText: text, sourceUrl: link.url, pageTitle: link.title || event.title || '网络文本谱', score, fetchMode: 'strict-importable-slice' }
}

async function resolveTextSource(event = {}) {
  const directText = String(event.raw_text || '').trim()
  if (directText) return { rawText: directText, sourceUrl: event.url || '', pageTitle: event.title || '文本谱', fetchMode: 'raw_text' }
  assertImportableEvent(event)
  const url = safeUrl(event.url || '')
  return tryExtractFromUrl({ title: event.title || '', url }, event)
}

function buildSearchKeywords(title = '', artist = '') {
  return Array.from(new Set([title, artist, `${title} ${artist}`.trim(), `${title} 吉他谱`, `${title} 和弦谱`, `${title} 弹唱谱`, `${title} txt`].filter(Boolean)))
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
    if (parsed.chordLineCount < 1 && parsed.chords.length < 3) return jsonResponse(422, '没有命中可转谱的文本曲谱资源')
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
      tags: ['网络文本谱', '精准转谱', '个人练习'],
      aliases: [],
      raw_text: rawText,
      content_json: {
        sections: parsed.sections,
        chords: parsed.chords,
        practiceTips: ['先按导入谱面慢速对照练习', '遇到不准的和弦可手动调整', '该谱为公开网页文本解析结果，仅作个人练习参考'],
        sourceUrl: source.sourceUrl,
        sourceTitle: source.pageTitle,
        importNotice: '公开网页文本谱精准解析结果，仅供个人练习参考。',
        fetchMode: source.fetchMode || 'strict-importable-slice',
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
    return jsonResponse(0, { songId: result._id, title: data.title, artist_name: data.artist_name, sourceUrl: source.sourceUrl, sections: parsed.sections.length, chords: parsed.chords, message: '已生成应用内曲谱详情' })
  } catch (error) {
    console.error('resource-tab-import error:', error)
    return jsonResponse(422, error?.message || '没有命中可转谱的文本曲谱资源')
  }
}
