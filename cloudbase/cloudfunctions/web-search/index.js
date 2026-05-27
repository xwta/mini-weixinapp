const cloud = require('wx-server-sdk')
let tcb = null
try { tcb = require('@cloudbase/node-sdk') } catch (_error) {}

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const cacheCollection = db.collection('web_search_cache')

// v13：AI/规则先理解搜谱意图，再重写搜索词，优先返回图片谱入口和具体曲谱线索。
const GLOBAL_DEADLINE_MS = 3800
const REQUEST_TIMEOUT_MS = 1450
const MAX_HTML_LENGTH = 260 * 1024
const MAX_REFERENCES = 16
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const CACHE_VERSION = 'v13-ai-intent-tab-search'
const USER_AGENT = process.env.WEB_SEARCH_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'

const memoryCache = new Map()

const KNOWN_ARTISTS = {
  '成都': '赵雷', '晴天': '周杰伦', '七里香': '周杰伦', '稻香': '周杰伦', '青花瓷': '周杰伦',
  '海阔天空': 'Beyond', '光辉岁月': 'Beyond', '真的爱你': 'Beyond', '喜欢你': 'Beyond',
  '半壶纱': '刘珂矣', '平凡之路': '朴树', '蓝莲花': '许巍', '曾经的你': '许巍',
  '董小姐': '宋冬野', '安和桥': '宋冬野', '夜空中最亮的星': '逃跑计划', '十年': '陈奕迅',
  '演员': '薛之谦', '消愁': '毛不易', '起风了': '买辣椒也用券',
}
const TRUSTED_DOMAINS = ['52cmajor.com', 'iloveguitar.cn', 'jita5.com', 'jitabang.com', 'qupu123.com', 'jitatang.com', '17jita.com', 'jita123.com', 'cangqiang.com', 'tan8.com']
const SEARCH_HOSTS = ['baidu.com', 'm.baidu.com', 'image.baidu.com', 'bing.com', 'cn.bing.com', 'duckduckgo.com', 'sogou.com']
const BLOCKED_RE = /(?:视频|教学|下载|网盘|app|破解|付费|登录|论坛|社区|问答|伴奏|mp3|mp4|课程|教程|商城|首页|首页_)/i
const TAB_RE = /吉他谱|和弦谱|弹唱谱|六线谱|图片谱|文本谱|变调夹|原调|选调|capo|chord|tab|guitar|C调|G调|D调/i
const IMAGE_RE = /图片谱|高清|image|jpg|png|webp|jpeg|六线谱/i

function jsonResponse(code, dataOrMessage) { return code === 0 ? { code, data: dataOrMessage } : { code, message: dataOrMessage } }
function decodeHtml(text = '') { return String(text || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\\u002f/gi, '/').replace(/\\\//g, '/').replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10))) }
function stripHtml(text = '') { return decodeHtml(String(text || '')).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }
function normalizeKeyword(keyword = '') { return String(keyword || '').replace(/吉他谱|曲谱|谱子|弹唱谱|和弦谱|歌词|歌曲|简谱|完整版|原版|简单版|教学|指弹|尤克里里|六线谱|图片谱|txt谱|TXT谱|gtp|guitar\s*(?:tab|chords?)?|chords?|tabs?/gi, ' ').replace(/[《》【】\[\]（）()]/g, ' ').replace(/[\s\-_·,，、。:：|｜/\\]+/g, ' ').trim() }
function stableKey(text = '') { return normalizeKeyword(text).replace(/\s+/g, '').toLowerCase() }
function parseHost(url = '') { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase() } catch (_error) { return '' } }
function isTrustedHost(url = '') { const host = parseHost(url); return TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)) }
function isSearchHost(url = '') { const host = parseHost(url); return SEARCH_HOSTS.some((d) => host === d || host.endsWith(`.${d}`)) }
function isSearchPage(url = '') { return /(?:\/search(?:\/|\?|$)|search\.asp|\/so(?:\/|\?|$)|\/Search(?:\/|\?|$)|\/s\?|\/images\/search)/i.test(url) }

function decodeBingBase64(value = '') {
  try {
    let raw = decodeURIComponent(String(value || ''))
    if (raw.startsWith('a1') || raw.startsWith('a2')) raw = raw.slice(2)
    raw = raw.replace(/-/g, '+').replace(/_/g, '/')
    while (raw.length % 4) raw += '='
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    return /^https?:\/\//i.test(decoded) ? decoded : ''
  } catch (_error) { return '' }
}
function decodeTrackingUrl(rawUrl = '', baseUrl = '') {
  let raw = decodeHtml(String(rawUrl || '').trim())
  if (!raw) return ''
  if (raw.startsWith('/l/?') || raw.includes('duckduckgo.com/l/?')) {
    try { const full = raw.startsWith('http') ? raw : `https://duckduckgo.com${raw}`; const parsed = new URL(full); const uddg = parsed.searchParams.get('uddg'); if (uddg) raw = decodeURIComponent(uddg) } catch (_error) {}
  }
  try {
    const parsed = new URL(raw, baseUrl || 'https://www.bing.com')
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    if ((host === 'bing.com' || host === 'cn.bing.com') && (/\/ck\/a/i.test(parsed.pathname) || parsed.pathname.includes('/link'))) {
      const u = parsed.searchParams.get('u') || parsed.searchParams.get('r') || parsed.searchParams.get('url') || ''
      const decoded = decodeBingBase64(u) || (u ? decodeURIComponent(u) : '')
      if (/^https?:\/\//i.test(decoded)) raw = decoded
    }
    if (host.endsWith('baidu.com') && parsed.pathname.includes('/link')) {
      const urlParam = parsed.searchParams.get('url') || parsed.searchParams.get('wd') || ''
      if (urlParam && /^https?:\/\//i.test(urlParam)) raw = decodeURIComponent(urlParam)
    }
  } catch (_error) {}
  return raw
}
function safeUrl(url = '', baseUrl = '') {
  try {
    let raw = decodeTrackingUrl(url, baseUrl)
    if (!raw || raw.startsWith('javascript:') || raw.startsWith('#')) return ''
    if (baseUrl && !/^https?:\/\//i.test(raw) && !raw.startsWith('//')) raw = new URL(raw, baseUrl).toString()
    if (raw.startsWith('//')) raw = `https:${raw}`
    const parsed = new URL(raw)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : ''
  } catch (_error) { return '' }
}
function headers(extra = {}) { return { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8', 'Cache-Control': 'no-cache', ...extra } }
function requestRaw(url, options = {}) {
  return new Promise((resolve, reject) => {
    let settled = false
    let req = null
    const finish = (value) => { if (settled) return; settled = true; resolve(value); if (req) req.destroy() }
    const fail = (error) => { if (settled) return; settled = true; reject(error); if (req) req.destroy(error) }
    try {
      const parsed = new URL(url)
      const transport = parsed.protocol === 'http:' ? require('http') : require('https')
      req = transport.request({ method: 'GET', hostname: parsed.hostname, path: `${parsed.pathname}${parsed.search}`, headers: options.headers || headers() }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) { res.resume(); requestRaw(new URL(res.headers.location, url).toString(), options).then(finish).catch(fail); return }
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => { raw += chunk; if (raw.length >= (options.maxLength || MAX_HTML_LENGTH)) finish(raw) })
        res.on('end', () => { if (res.statusCode < 200 || res.statusCode >= 300) fail(new Error(`provider status ${res.statusCode}`)); else finish(raw) })
        res.on('error', fail)
      })
      req.setTimeout(options.timeout || REQUEST_TIMEOUT_MS, () => fail(new Error('provider timeout')))
      req.on('error', fail)
      req.end()
    } catch (error) { fail(error) }
  })
}
function settleWithin(promise, ms, fallback) { return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]) }
async function safeSearch(task, label, query) { try { return await task() } catch (error) { console.log(`${label} failed`, query, error?.message || error); return [] } }

function parseIntentByRule(keyword = '') {
  const raw = String(keyword || '').trim()
  const clean = normalizeKeyword(raw)
  const compact = clean.replace(/\s+/g, '')
  const outputPreference = /图片|图谱|六线谱|高清|image/i.test(raw) ? 'image' : /txt|文本|和弦|弹唱/i.test(raw) ? 'txt' : 'auto'
  const difficulty = /简单|新手|初学|入门|easy/i.test(raw) ? '新手' : /进阶|高级|solo/i.test(raw) ? '进阶' : '新手'
  const keyMatch = raw.match(/([A-G](?:#|b|♭)?)[调版]?/i)
  const requestedKey = keyMatch ? keyMatch[1].replace('♭', 'b').toUpperCase() : ''
  const artist = KNOWN_ARTISTS[clean] || KNOWN_ARTISTS[compact] || ''
  const title = clean || raw
  return { raw, title, artist, clean, compact, outputPreference, difficulty, requestedKey }
}
function normalizeIntent(intent = {}, keyword = '') {
  const rule = parseIntentByRule(keyword)
  const title = normalizeKeyword(intent.title || '') || rule.title
  const compact = title.replace(/\s+/g, '')
  const artist = String(intent.artist || rule.artist || KNOWN_ARTISTS[title] || KNOWN_ARTISTS[compact] || '').trim()
  const outputPreference = ['image', 'txt'].includes(intent.outputPreference) ? intent.outputPreference : rule.outputPreference
  const difficulty = String(intent.difficulty || rule.difficulty || '新手')
  const requestedKey = String(intent.requestedKey || rule.requestedKey || '').replace('♭', 'b')
  const base = [title, artist].filter(Boolean).join(' ')
  return { raw: keyword, title, artist, clean: title, compact, base, outputPreference, difficulty, requestedKey }
}
function extractJsonString(rawText = '') {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()
  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) return rawText.slice(firstBrace, lastBrace + 1)
  return rawText.trim()
}
async function parseIntentWithAi(keyword = '') {
  if (!tcb) return parseIntentByRule(keyword)
  try {
    const envId = process.env.TCB_ENV || process.env.CLOUDBASE_ENV_ID || process.env.SCF_NAMESPACE
    const app = envId ? tcb.init({ env: envId }) : tcb.init()
    const model = app.ai().createModel(process.env.WEB_SEARCH_AI_PROVIDER || 'hunyuan-v3')
    const prompt = `只输出JSON。请从用户搜谱输入中提取：title歌名、artist歌手、outputPreference取image/txt/auto、difficulty取新手/进阶、requestedKey调式。用户输入：${keyword}`
    const res = await settleWithin(model.generateText({ model: process.env.WEB_SEARCH_AI_MODEL || 'hy3-preview', messages: [{ role: 'user', content: prompt }], temperature: 0.1 }), 900, null)
    const text = typeof res === 'string' ? res : (res?.text || res?.content || res?.data?.content || res?.choices?.[0]?.message?.content || '')
    if (!text) return parseIntentByRule(keyword)
    return { ...parseIntentByRule(keyword), ...JSON.parse(extractJsonString(text)) }
  } catch (_error) {
    return parseIntentByRule(keyword)
  }
}
function buildSearchQueriesFromIntent(intent = {}) {
  const base = intent.base || intent.clean || intent.raw
  const title = intent.clean || intent.raw
  const keyWord = intent.requestedKey ? `${intent.requestedKey}调` : ''
  const difficultyWord = intent.difficulty === '新手' ? '简单版 新手' : '进阶版'
  const imageFirst = intent.outputPreference === 'image'
  const queries = [
    `${base} 吉他谱 ${keyWord}`,
    `${base} 六线谱 ${difficultyWord}`,
    `${base} 和弦谱 弹唱谱`,
    `${base} 图片谱 高清`,
    `${title} 吉他谱`,
    ...TRUSTED_DOMAINS.slice(0, 8).map((domain) => `site:${domain} ${base} 吉他谱`),
  ].filter(Boolean).map((q) => q.replace(/\s+/g, ' ').trim())
  const unique = Array.from(new Set(queries))
  if (imageFirst) unique.sort((a, b) => (/图片|六线/.test(b) ? 1 : 0) - (/图片|六线/.test(a) ? 1 : 0))
  return unique.slice(0, 12)
}

function getRefType(item = {}) { const provider = String(item.provider || '').toLowerCase(); const text = `${item.title || ''} ${item.snippet || ''} ${item.url || ''}`; if (item.result_type === 'fallback') return 'fallback'; if (provider.includes('image') || item.thumbnail_url || item.image_url || IMAGE_RE.test(text)) return 'image'; if (isTrustedHost(item.url) || TAB_RE.test(text)) return 'text'; return 'web' }
function isPreviewableReference(ref = {}) { return getRefType(ref) === 'image' && Boolean(ref.thumbnail_url || ref.image_url || ref.url) }
function isImportableReference(ref = {}) { const text = `${ref.title || ''} ${ref.snippet || ''} ${ref.url || ''}`; if (isSearchHost(ref.url) || isSearchPage(ref.url)) return false; if (BLOCKED_RE.test(text)) return false; if (/\.(?:jpg|jpeg|png|webp|gif|pdf|mp3|mp4)(?:\?|$)/i.test(ref.url || '')) return false; return isTrustedHost(ref.url) && TAB_RE.test(text) }
function scoreReference(item = {}, query = '') {
  const title = String(item.title || '').toLowerCase(); const text = `${item.title || ''} ${item.snippet || ''} ${item.url || ''}`.toLowerCase(); const clean = normalizeKeyword(query).toLowerCase(); const compactClean = clean.replace(/\s+/g, ''); const compactAll = text.replace(/\s+/g, '')
  let score = 0
  if (compactClean && title.replace(/\s+/g, '').includes(compactClean)) score += 48
  if (compactClean && compactAll.includes(compactClean)) score += 24
  if (TAB_RE.test(text)) score += 32
  if (isTrustedHost(item.url)) score += 44
  if (item.provider === 'trusted_link_scan' || item.provider === 'baidu_real_url') score += 30
  if (isSearchHost(item.url) || isSearchPage(item.url)) score -= 70
  if (BLOCKED_RE.test(text)) score -= 45
  if (isImportableReference(item)) score += 32
  if (isPreviewableReference(item)) score += 16
  return score
}
function enrichReference(ref = {}, query = '') { const resultType = getRefType(ref); const base = { ...ref, result_type: resultType }; const importable = isImportableReference(base); const previewable = isPreviewableReference(base); return { ...base, importable, previewable, action_hint: previewable ? 'preview' : importable ? 'import' : 'view_only', action_label: previewable ? '预览图片谱' : importable ? '作为AI线索' : '打开查找', tab_score: Number(ref.tab_score || 0) || scoreReference(base, query) } }
function makeRef({ title, url, snippet = '', provider = 'web', query = '', resultType = 'web', thumbnailUrl = '', imageUrl = '', scoreBoost = 0 }) { const safe = safeUrl(url); if (!safe) return null; const raw = { title: stripHtml(title).slice(0, 120), url: safe.slice(0, 500), snippet: stripHtml(snippet).slice(0, 240), category: 'tab_reference', provider, result_type: resultType, thumbnail_url: safeUrl(thumbnailUrl), image_url: safeUrl(imageUrl), source_site: parseHost(safe) }; const ref = enrichReference(raw, query); ref.tab_score = scoreReference(ref, query) + Number(scoreBoost || 0); return ref }
function compactReferences(references = [], max = MAX_REFERENCES, query = '') {
  const seen = new Set()
  const items = references.filter(Boolean).filter((item) => item.title && item.url).map((item) => enrichReference(item, query)).filter((item) => {
    const key = `${parseHost(item.url)}:${stableKey(item.title)}:${item.url.replace(/[?#].*$/, '').slice(0, 160)}`
    if (seen.has(key)) return false
    seen.add(key)
    if ((isSearchHost(item.url) || isSearchPage(item.url)) && item.result_type !== 'fallback') return false
    if (BLOCKED_RE.test(`${item.title || ''} ${item.snippet || ''}`) && !item.previewable && !item.importable) return false
    return true
  }).sort((a, b) => {
    const aAction = (a.importable ? 60 : 0) + (a.previewable ? 30 : 0)
    const bAction = (b.importable ? 60 : 0) + (b.previewable ? 30 : 0)
    return (bAction - aAction) || Number(b.tab_score || 0) - Number(a.tab_score || 0)
  })
  const importable = items.filter((item) => item.importable).slice(0, 7)
  const previewable = items.filter((item) => item.previewable).slice(0, 5)
  const viewOnly = items.filter((item) => !item.importable && !item.previewable && item.result_type !== 'fallback').slice(0, Math.max(0, max - importable.length - previewable.length))
  const fallback = items.filter((item) => item.result_type === 'fallback').slice(0, Math.max(0, max - importable.length - previewable.length - viewOnly.length))
  return [...importable, ...previewable, ...viewOnly, ...fallback].slice(0, max)
}
function pushTrustedUrl(rows, url, query, provider, title = '', snippet = '') { const safe = safeUrl(url); if (!safe || !isTrustedHost(safe) || isSearchPage(safe)) return; rows.push(makeRef({ title: title || `${query} 吉他谱`, url: safe, snippet: snippet || '已解析到具体曲谱页面，可作为AI生成线索。', provider, query, resultType: 'text', scoreBoost: 38 })) }
function extractBaiduRealUrls(html = '', query = '') {
  const decoded = decodeHtml(html); const rows = []; let match
  const muRe = /\bmu=(['"])(https?:\/\/.*?)\1/gi
  while ((match = muRe.exec(decoded)) && rows.length < 40) pushTrustedUrl(rows, match[2], query, 'baidu_real_url', `${query} 吉他谱`, '百度结果真实链接，可作为AI生成线索。')
  const dataToolsRe = /data-tools=(['"])([\s\S]{10,600}?)\1/gi
  while ((match = dataToolsRe.exec(decoded)) && rows.length < 80) {
    const dataText = decodeHtml(match[2])
    const urlMatch = dataText.match(/"url"\s*:\s*"(https?:[^"\\]+(?:\\.[^"\\]*)*)"/) || dataText.match(/'url'\s*:\s*'(https?:[^']+)'/)
    if (urlMatch?.[1]) pushTrustedUrl(rows, urlMatch[1], query, 'baidu_real_url', `${query} 吉他谱`, '百度结果真实链接，可作为AI生成线索。')
  }
  return compactReferences(rows, 8, query)
}
function extractTrustedLinks(html = '', query = '', provider = 'trusted_link_scan', baseUrl = 'https://www.bing.com') {
  const decoded = decodeHtml(html)
  const rows = [...extractBaiduRealUrls(decoded, query)]
  const hrefRe = /href=(['"])(.*?)\1/gi
  let match
  while ((match = hrefRe.exec(decoded)) && rows.length < 100) {
    const url = safeUrl(match[2], baseUrl)
    if (!url || !isTrustedHost(url) || isSearchPage(url)) continue
    const around = stripHtml(decoded.slice(Math.max(0, match.index - 240), match.index + 560))
    if (!TAB_RE.test(`${around} ${url}`) && !stableKey(`${around} ${url}`).includes(stableKey(query).slice(0, 8))) continue
    rows.push(makeRef({ title: around.slice(0, 100) || `${query} 吉他谱`, url, snippet: '已解析到具体曲谱页面，可作为AI生成线索。', provider, query, resultType: 'text', scoreBoost: 38 }))
  }
  const domainPart = TRUSTED_DOMAINS.map((d) => d.replace(/\./g, '\\.')).join('|')
  const plainUrlRe = new RegExp(`https?:\\/\\/(?:www\\.)?(?:${domainPart})[^\\s"'<>]+`, 'gi')
  while ((match = plainUrlRe.exec(decoded)) && rows.length < 140) pushTrustedUrl(rows, match[0], query, provider, `${query} 吉他谱`)
  return compactReferences(rows, 10, query)
}
function parseBing(html = '', query = '', baseUrl = 'https://www.bing.com') { const results = [...extractTrustedLinks(html, query, 'trusted_link_scan', baseUrl)]; const blocks = html.split(/<li[^>]+class=(['"])[^'"]*b_algo[^'"]*\1[^>]*>/i).slice(1); for (const block of blocks.slice(0, 8)) { const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i); if (!titleMatch) continue; const snippet = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ''; const ref = makeRef({ title: titleMatch[3], url: safeUrl(titleMatch[2], baseUrl), snippet, provider: 'bing', query, scoreBoost: 16 }); if (ref && (ref.importable || ref.previewable || ref.tab_score > 58)) results.push(ref) } return compactReferences(results, 10, query) }
function parseDuckDuckGo(html = '', query = '') { const results = [...extractTrustedLinks(html, query, 'trusted_link_scan', 'https://duckduckgo.com')]; const blocks = html.split(/<div[^>]+class=(['"])[^'"]*result[^'"]*\1[^>]*>/i).slice(1); for (const block of blocks.slice(0, 8)) { const titleMatch = block.match(/<a[^>]+href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i); if (!titleMatch) continue; const ref = makeRef({ title: titleMatch[3], url: safeUrl(titleMatch[2], 'https://duckduckgo.com'), snippet: '', provider: 'duckduckgo', query, scoreBoost: 12 }); if (ref && (ref.importable || ref.previewable || ref.tab_score > 58)) results.push(ref) } return compactReferences(results, 10, query) }
function parseBaiduWeb(html = '', query = '') { return compactReferences(extractTrustedLinks(html, query, 'trusted_link_scan', 'https://www.baidu.com'), 10, query) }
async function searchBing(query) { const html = await requestRaw(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=8`, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://www.bing.com/' }) }); return parseBing(html, query, 'https://www.bing.com') }
async function searchBingCn(query) { const html = await requestRaw(`https://cn.bing.com/search?q=${encodeURIComponent(query)}&count=8`, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://cn.bing.com/' }) }); return parseBing(html, query, 'https://cn.bing.com') }
async function searchDuckDuckGo(query) { const html = await requestRaw(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://duckduckgo.com/' }) }); return parseDuckDuckGo(html, query) }
async function searchBaiduWeb(query) { const html = await requestRaw(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=8&ie=utf-8`, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://www.baidu.com/' }) }); return parseBaiduWeb(html, query) }
async function searchBaiduImages(query) {
  const raw = await requestRaw(`https://image.baidu.com/search/acjson?tn=resultjson_com&ipn=rj&word=${encodeURIComponent(query)}&queryWord=${encodeURIComponent(query)}&pn=0&rn=8&ie=utf-8&oe=utf-8`, { timeout: REQUEST_TIMEOUT_MS, headers: headers({ Referer: 'https://image.baidu.com/' }), maxLength: 180 * 1024 })
  let data = {}; try { data = JSON.parse(raw || '{}') } catch (_error) { data = {} }
  const rows = []
  ;(data.data || []).slice(0, 6).forEach((item) => {
    const title = item.fromPageTitleEnc || item.fromPageTitle || item.title || `${query} 图片谱`
    const pageUrl = item.fromURL || item.fromUrl || item.objURL || item.hoverURL || item.middleURL || ''
    const thumb = item.thumbURL || item.thumbnailUrl || item.middleURL || item.objURL || ''
    const imageUrl = item.objURL || item.middleURL || item.hoverURL || thumb
    if (!thumb && !imageUrl) return
    rows.push(makeRef({ title, url: pageUrl || imageUrl, snippet: '图片谱资源，可在小程序内预览。', provider: 'baidu_image', query, resultType: 'image', thumbnailUrl: thumb, imageUrl, scoreBoost: 22 }))
  })
  return compactReferences(rows, 6, query)
}
function buildFallbackReferences(intent = {}) {
  const base = intent.base || intent.clean || intent.raw
  const query = `${base} 吉他谱 六线谱 图片谱`
  const siteRefs = TRUSTED_DOMAINS.slice(0, 6).map((domain) => makeRef({ title: `${domain}：${base} 吉他谱`, url: `https://cn.bing.com/search?q=${encodeURIComponent(`site:${domain} ${base} 吉他谱`)}`, snippet: `定向查找 ${domain} 的具体曲谱页面。`, provider: 'trusted_site_entry', query, resultType: 'fallback', scoreBoost: 10 }))
  return compactReferences([makeRef({ title: `图片谱：${base}`, url: `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(query)}`, snippet: '小程序将尝试从图片搜索中提取可预览谱图。', provider: 'baidu_image', query, resultType: 'image', scoreBoost: 30 }), ...siteRefs], MAX_REFERENCES, query)
}
function ensureImageFallback(references = [], intent = {}) {
  const refs = [...references]
  if (!refs.some((item) => item.previewable || item.result_type === 'image')) refs.unshift(...buildFallbackReferences(intent).filter((item) => item.result_type === 'image').slice(0, 1))
  return compactReferences(refs, MAX_REFERENCES, intent.base || intent.raw)
}
async function searchFast(intent = {}) {
  const queries = buildSearchQueriesFromIntent(intent)
  const q1 = queries[0]
  const q2 = queries[1] || q1
  const siteQueries = queries.filter((q) => /^site:/.test(q)).slice(0, 5)
  const jobs = [
    safeSearch(() => searchBingCn(q1), 'bing cn', q1),
    safeSearch(() => searchBing(q1), 'bing', q1),
    safeSearch(() => searchDuckDuckGo(q1), 'duck', q1),
    safeSearch(() => searchBaiduWeb(q1), 'baidu', q1),
    safeSearch(() => searchBaiduImages(intent.outputPreference === 'image' ? q1 : `${intent.base} 吉他谱 图片谱`), 'baidu image', q1),
    safeSearch(() => searchBingCn(q2), 'bing second', q2),
    ...siteQueries.map((q) => safeSearch(() => searchBingCn(q), 'site cn', q)),
  ]
  const rawResults = (await settleWithin(Promise.all(jobs), GLOBAL_DEADLINE_MS, [])).flat()
  const references = ensureImageFallback(compactReferences(rawResults, MAX_REFERENCES, intent.base), intent)
  return { references: references.length ? references : buildFallbackReferences(intent), debug: queries.map((query) => ({ query, mode: 'ai_intent_tab_search', timeoutMs: REQUEST_TIMEOUT_MS, total: references.length })) }
}
function extractArrangementHints(references = [], intent = {}) { return { possibleKeys: intent.requestedKey ? [intent.requestedKey] : [], possibleCapos: [], possibleChords: [], tabReferenceCount: references.length, imageReferenceCount: references.filter((i) => i.previewable).length, textReferenceCount: references.filter((i) => i.importable || i.result_type === 'text').length, viewOnlyCount: references.filter((i) => !i.importable && !i.previewable).length, outputPreference: intent.outputPreference, difficulty: intent.difficulty } }
function buildCandidate(intent, references, debug = []) { const refs = references.length ? references : buildFallbackReferences(intent); const hints = extractArrangementHints(refs, intent); return { title: intent.clean, artist: intent.artist, album: '', duration: 0, confidence: refs.some((item) => item.importable || item.previewable) ? 0.9 : 0.62, source: 'ai_intent_tab_search', summary: `已识别《${intent.clean}》${intent.artist ? ` - ${intent.artist}` : ''}，返回 ${refs.length} 条曲谱线索，其中 ${hints.imageReferenceCount || 0} 条可预览图片谱、${hints.textReferenceCount || 0} 条可作为AI生成线索。`, references: refs.slice(0, 8), tabReferences: refs, arrangementHints: hints, searchDebug: debug, provider: 'ai_intent_tab_search', preferred_output_type: intent.outputPreference === 'image' ? 'image' : 'txt' } }
async function getPersistentCache(cacheKey) { try { const cached = await cacheCollection.where({ cache_key: cacheKey }).limit(1).get(); const row = cached.data?.[0]; if (row?.payload && row?.created_at && Date.now() - new Date(row.created_at).getTime() <= CACHE_TTL_MS) return row.payload } catch (_error) {}; return null }
async function setPersistentCache(cacheKey, payload) { try { const existed = await cacheCollection.where({ cache_key: cacheKey }).limit(1).get(); const now = new Date(); if (existed.data?.[0]?._id) await cacheCollection.doc(existed.data[0]._id).update({ data: { payload, updated_at: now, created_at: existed.data[0].created_at || now } }); else await cacheCollection.add({ data: { cache_key: cacheKey, payload, created_at: now, updated_at: now } }) } catch (_error) {} }

exports.main = async (event = {}) => {
  const action = event.action || 'tabLookup'
  const keyword = String(event.keyword || event.query || '').trim()
  const forceRefresh = Boolean(event.force_refresh || event.forceRefresh)
  if (!['songLookup', 'tabLookup'].includes(action)) return jsonResponse(400, `Unknown action: ${action}`)
  if (!keyword) return jsonResponse(400, '请输入要搜索的歌曲关键词')

  const ruleIntent = parseIntentByRule(keyword)
  const cacheKey = `tab_search:${CACHE_VERSION}:${stableKey(keyword)}:${ruleIntent.outputPreference}`
  if (!forceRefresh) {
    const memoryCached = memoryCache.get(cacheKey)
    if (memoryCached && Date.now() - memoryCached.createdAt <= CACHE_TTL_MS) return jsonResponse(0, memoryCached.value)
    const cached = await getPersistentCache(cacheKey)
    if (cached) { memoryCache.set(cacheKey, { value: cached, createdAt: Date.now() }); return jsonResponse(0, cached) }
  }

  try {
    const aiIntentRaw = await settleWithin(parseIntentWithAi(keyword), 1000, ruleIntent)
    const intent = normalizeIntent(aiIntentRaw, keyword)
    const searchResult = await settleWithin(searchFast(intent), GLOBAL_DEADLINE_MS + 400, { references: buildFallbackReferences(intent), debug: [] })
    const response = { query: keyword, queryIntent: intent, queryVariants: [intent.clean, intent.base].filter(Boolean), tabQueryVariants: buildSearchQueriesFromIntent(intent), tabSearchEnabled: true, candidates: [buildCandidate(intent, searchResult.references || [], searchResult.debug || [])], canGenerate: true, provider: 'ai_intent_tab_search', cacheVersion: CACHE_VERSION, notice: '已先理解歌名、歌手和谱面偏好，再搜索曲谱资源。', debug: searchResult.debug || [] }
    memoryCache.set(cacheKey, { value: response, createdAt: Date.now() })
    await setPersistentCache(cacheKey, response)
    return jsonResponse(0, response)
  } catch (error) {
    const intent = normalizeIntent(ruleIntent, keyword)
    const fallback = buildFallbackReferences(intent)
    return jsonResponse(0, { query: keyword, queryIntent: intent, queryVariants: [intent.clean, intent.base].filter(Boolean), tabQueryVariants: buildSearchQueriesFromIntent(intent), tabSearchEnabled: true, candidates: [buildCandidate(intent, fallback, [{ error: error?.message || String(error), mode: 'fallback' }])], canGenerate: true, provider: 'ai_intent_fallback', cacheVersion: CACHE_VERSION, notice: '网络搜索较慢，已返回图片谱入口和站点定向搜索入口。', debug: [] })
  }
}
