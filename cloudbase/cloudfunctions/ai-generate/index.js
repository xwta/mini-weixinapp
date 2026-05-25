const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const users = db.collection('users')
const songs = db.collection('songs')

const bannedWords = ['赌博', '诈骗', '违禁', '暴力', '恐怖主义']

function reviewContent(text = '') {
  return !bannedWords.some((word) => text.includes(word))
}

function normalizeText(input) {
  if (!input) return ''
  if (typeof input === 'string') return input
  if (Array.isArray(input)) return input.map((item) => normalizeText(item)).join('')
  if (typeof input === 'object') {
    const direct = input.text || input.content || input.output || input.answer
    if (typeof direct === 'string') return direct
    const parts = [
      input?.data?.content,
      input?.choices?.[0]?.message?.content,
      input?.choices?.[0]?.delta?.content,
      input?.result,
      input?.response,
      input?.message,
    ]
    const first = parts.find((item) => typeof item === 'string')
    if (first) return first
    try {
      return JSON.stringify(input)
    } catch (_error) {
      return ''
    }
  }
  return String(input)
}

function extractJsonString(rawText = '') {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1)
  }

  return rawText.trim()
}

function normalizeSectionLines(lines = []) {
  return lines
    .map((line) => {
      if (!line) return null
      if (typeof line === 'string') return { chordLine: '', lyricLine: line }
      return {
        chordLine: String(line.chordLine || line.chord || ''),
        lyricLine: String(line.lyricLine || line.lyric || line.text || ''),
      }
    })
    .filter((line) => line && line.lyricLine)
}

function normalizeSongPayload(payload = {}, fallback = {}) {
  const sections = Array.isArray(payload.sections)
    ? payload.sections.map((section) => ({
        name: String(section?.name || '正文'),
        lines: normalizeSectionLines(section?.lines || []),
      })).filter((section) => section.lines.length)
    : []

  const safeSections = sections.length
    ? sections
    : [
        {
          name: '正文',
          lines: [{ chordLine: '', lyricLine: fallback.lyrics || '今天也要认真练琴。' }],
        },
      ]

  const chords = Array.isArray(payload.chords)
    ? payload.chords.map((item) => String(item)).filter(Boolean)
    : []

  const practiceTips = Array.isArray(payload.practiceTips)
    ? payload.practiceTips.map((item) => String(item)).filter(Boolean)
    : ['先慢速分段练习，再合并全曲。']

  return {
    title: String(payload.title || fallback.title || 'AI原创弹唱歌'),
    style: String(payload.style || fallback.style || '民谣'),
    song_key: String(payload.song_key || payload.key || fallback.song_key || 'C'),
    bpm: Number(payload.bpm || fallback.bpm || 86),
    capo: String(payload.capo || fallback.capo || '0品'),
    difficulty: String(payload.difficulty || fallback.difficulty || '新手'),
    strumming: String(payload.strumming || fallback.strumming || '下 下上 上下上'),
    chords,
    sections: safeSections,
    practiceTips,
  }
}

function sectionsToRawText(sections = []) {
  return sections
    .map((section) => {
      const lines = section.lines
        .map((line) => {
          if (line.chordLine) return `${line.chordLine}\n${line.lyricLine}`
          return line.lyricLine
        })
        .join('\n')
      return `[${section.name}]\n${lines}`
    })
    .join('\n\n')
}

function sanitizeReferences(references = []) {
  return (Array.isArray(references) ? references : [])
    .slice(0, 8)
    .map((item) => ({
      title: String(item?.title || '').slice(0, 120),
      url: String(item?.url || '').slice(0, 500),
      snippet: String(item?.snippet || '').slice(0, 180),
      category: String(item?.category || '').slice(0, 40),
      provider: String(item?.provider || '').slice(0, 40),
      tab_score: Number(item?.tab_score || 0),
    }))
    .filter((item) => item.title || item.url || item.snippet)
}

function sanitizeHints(hints = {}) {
  return {
    possibleKeys: Array.isArray(hints.possibleKeys) ? hints.possibleKeys.map(String).slice(0, 4) : [],
    possibleCapos: Array.isArray(hints.possibleCapos) ? hints.possibleCapos.map(String).slice(0, 4) : [],
    possibleChords: Array.isArray(hints.possibleChords) ? hints.possibleChords.map(String).slice(0, 12) : [],
    tabReferenceCount: Number(hints.tabReferenceCount || 0),
  }
}

function buildWebContext(event = {}) {
  const context = event.web_context || {}
  const references = sanitizeReferences(context.references)
  const tabReferences = sanitizeReferences(context.tabReferences)
  const arrangementHints = sanitizeHints(context.arrangementHints)
  return {
    title: String(event.title || context.title || '').trim(),
    artist: String(event.artist || context.artist || '').trim(),
    summary: String(context.summary || '').slice(0, 800),
    confidence: Number(context.confidence || 0),
    source: String(context.source || 'web'),
    references,
    tabReferences,
    arrangementHints,
  }
}

function buildSongPrompt(event) {
  const webContext = buildWebContext(event)
  const isWebChords = event.type === 'web_chords'
  const webLines = webContext.references
    .map((item, index) => `${index + 1}. ${item.title} ${item.snippet}`.trim())
    .join('\n')
  const tabLines = webContext.tabReferences
    .map((item, index) => `${index + 1}. ${item.title} ${item.snippet}`.trim())
    .join('\n')
  const hintLines = [
    webContext.arrangementHints.possibleKeys.length ? `疑似调式：${webContext.arrangementHints.possibleKeys.join('、')}` : '',
    webContext.arrangementHints.possibleCapos.length ? `疑似变调夹：${webContext.arrangementHints.possibleCapos.join('、')}` : '',
    webContext.arrangementHints.possibleChords.length ? `线索中出现的和弦：${webContext.arrangementHints.possibleChords.join('、')}` : '',
    webContext.arrangementHints.tabReferenceCount ? `吉他谱/和弦谱线索数量：${webContext.arrangementHints.tabReferenceCount}` : '',
  ].filter(Boolean).join('\n')

  const commonRules = `\n硬性要求：\n1) 只输出 JSON，不要输出任何额外文字。\n2) JSON 字段必须包含：title, style, song_key, bpm, capo, difficulty, strumming, chords, sections, practiceTips\n3) sections 为数组，每个元素包含：name, lines\n4) lines 为数组，每行包含：chordLine, lyricLine\n5) chords 为和弦名数组，如 [\"C\",\"G\",\"Am\",\"F\"]\n6) practiceTips 提供 2-4 条具体练习建议\n`

  if (isWebChords) {
    return `\n你是一位专业中文吉他弹唱编曲助手。\n请根据歌曲名称、歌手、音乐元数据和吉他谱搜索线索，生成“AI 简化弹唱编配版”吉他谱。\n\n重要版权边界：\n1) 不要复制、复刻或输出第三方网站的完整歌词。\n2) 不要复制任何现成吉他谱、TAB、逐字和弦谱。\n3) 不要声称这是官方谱或原版谱。\n4) 吉他谱/和弦谱线索只能用来判断风格、难度、可能调式、变调夹和常见和弦走向。\n5) 你要生成适合练习的原创简化编配，可使用少量占位式歌词短句、段落提示或节拍提示。\n6) 如果线索中出现疑似调式、变调夹、常见和弦，优先参考；但不要机械照抄。\n${commonRules}\n歌曲信息：\n- 歌名：${webContext.title || event.title || ''}\n- 歌手：${webContext.artist || event.artist || ''}\n- 难度：${event.difficulty || '新手'}\n- 目标调式：${event.song_key || 'C'}\n- 网络摘要：${webContext.summary || ''}\n\n编配线索：\n${hintLines || '无明确调式、变调夹或和弦线索'}\n\n音乐元数据参考摘要：\n${webLines || '无'}\n\n吉他谱/和弦谱搜索线索摘要：\n${tabLines || '无'}\n\n生成偏好：\n- 优先生成新手可弹版本。\n- 和弦数量建议 4-8 个。\n- 若疑似原曲较复杂，请降级为 C/G 调附近的弹唱版。\n- 每个段落给出清晰 chordLine 和 lyricLine，占位歌词不要超过短句级别。\n\n请返回严格 JSON。title 建议使用“${webContext.title || event.title || '目标歌曲'} AI简化弹唱版”。\n`
  }

  return `\n你是一位专业中文吉他弹唱编曲助手。\n请根据用户需求生成“可直接练习”的中文吉他弹唱谱。\n${commonRules}\n用户需求：\n- 模式：${event.type || 'songwriting'}\n- 风格：${event.style || '民谣'}\n- 难度：${event.difficulty || '新手'}\n- 调式：${event.song_key || 'C'}\n- 写歌灵感：${event.prompt || ''}\n- 歌词（若有）：${event.lyrics || ''}\n\n请返回严格 JSON。\n`
}

function resolveEnvId(wxContext) {
  return (
    process.env.TCB_ENV ||
    process.env.CLOUDBASE_ENV_ID ||
    process.env.SCF_NAMESPACE ||
    wxContext?.ENV ||
    undefined
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorCode(error) {
  return String(error?.code || error?.statusCode || '')
}

async function callCloudbaseModel(event, wxContext) {
  const envId = resolveEnvId(wxContext)
  const app = envId ? tcb.init({ env: envId }) : tcb.init()
  const providerCandidates = Array.from(new Set([
    event.provider || 'hunyuan-v3',
    'hunyuan-v3',
    'hunyuan-open',
    'hunyuan-exp',
    'hunyuan',
    'cloudbase',
  ]))

  let lastError
  for (const provider of providerCandidates) {
    const model = app.ai().createModel(provider)

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await model.generateText({
          model: event.model || 'hy3-preview',
          messages: [
            {
              role: 'user',
              content: buildSongPrompt(event),
            },
          ],
          temperature: 0.7,
        })

        return normalizeText(result)
      } catch (error) {
        lastError = error
        const code = getErrorCode(error)

        if (code === '429' && attempt < 2) {
          await sleep(450 * attempt)
          continue
        }

        if (code === '429') {
          break
        }
      }
    }
  }

  throw lastError || new Error('AI 模型调用失败')
}

async function getCurrentUser(openid) {
  const result = await users.where({ openid }).limit(1).get()
  return result.data[0] || null
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID || event.openid || 'debug-openid'
  const now = new Date()
  const webContext = buildWebContext(event)
  const isWebChords = event.type === 'web_chords'

  const sourceText = String(event.prompt || event.lyrics || event.title || webContext.title || webContext.summary || '')
  if (!reviewContent(sourceText)) {
    return { code: 403, message: '内容审核未通过，请调整后重试' }
  }

  let user = await getCurrentUser(openid)
  if (!user) {
    const seed = {
      openid,
      nickname: '谱灵用户',
      avatar_url: '',
      membership_type: 'free',
      generation_quota: 10,
      daily_free_quota: 5,
      total_generated: 0,
      works_count: 0,
      followers_count: 0,
      following_count: 0,
      likes_count: 0,
      status: 'active',
      created_at: now,
      updated_at: now,
      last_login_at: now,
    }
    const created = await users.add({ data: seed })
    user = { _id: created._id, ...seed }
  }

  if ((user.generation_quota || 0) <= 0 && user.membership_type === 'free') {
    return { code: 403, message: '今日免费额度已用完，请明日再试' }
  }

  try {
    const rawModelText = await callCloudbaseModel(event, wxContext)
    const jsonText = extractJsonString(rawModelText)

    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch (_error) {
      parsed = {
        title: isWebChords
          ? `${webContext.title || event.title || '目标歌曲'} AI简化弹唱版`
          : event.type === 'chords' ? '歌词配和弦结果' : 'AI原创弹唱歌',
        style: event.style || '民谣',
        song_key: event.song_key || webContext.arrangementHints.possibleKeys[0] || 'C',
        capo: webContext.arrangementHints.possibleCapos[0] || '0品',
        difficulty: event.difficulty || '新手',
        sections: [{ name: '正文', lines: [{ chordLine: 'C G Am F', lyricLine: sourceText || '今天也要认真练琴。' }] }],
        chords: webContext.arrangementHints.possibleChords.length ? webContext.arrangementHints.possibleChords.slice(0, 6) : ['C', 'G', 'Am', 'F'],
        practiceTips: ['先慢后快，分段练习。'],
      }
    }

    const normalized = normalizeSongPayload(parsed, {
      title: isWebChords
        ? `${webContext.title || event.title || '目标歌曲'} AI简化弹唱版`
        : event.type === 'chords' ? '歌词配和弦结果' : 'AI原创弹唱歌',
      style: event.style || '民谣',
      song_key: event.song_key || webContext.arrangementHints.possibleKeys[0] || 'C',
      capo: webContext.arrangementHints.possibleCapos[0] || '0品',
      difficulty: event.difficulty || '新手',
      lyrics: sourceText,
    })

    const rawText = sectionsToRawText(normalized.sections)
    const isPublic = Boolean(event.is_public) && !isWebChords
    const data = {
      user_openid: openid,
      user_id: user._id,
      title: normalized.title,
      artist_name: isWebChords ? (webContext.artist || event.artist || 'AI编配') : 'AI生成',
      original_song_title: isWebChords ? (webContext.title || event.title || '') : '',
      original_artist_name: isWebChords ? (webContext.artist || event.artist || '') : '',
      style: normalized.style,
      song_key: normalized.song_key,
      bpm: normalized.bpm,
      capo: normalized.capo,
      difficulty: normalized.difficulty,
      strumming: normalized.strumming,
      tags: isWebChords ? ['AI编配', '网络搜索', '吉他谱线索', normalized.style] : ['AI', normalized.style],
      raw_text: rawText,
      content_json: {
        sections: normalized.sections,
        chords: normalized.chords,
        practiceTips: normalized.practiceTips,
        copyrightNotice: isWebChords ? 'AI 生成的简化弹唱编配，非官方曲谱。' : '',
        arrangementHints: isWebChords ? webContext.arrangementHints : null,
      },
      generation_source: isWebChords ? {
        type: 'web_search',
        provider: webContext.source || 'web',
        confidence: webContext.confidence || 0,
        summary: webContext.summary || '',
        references: webContext.references,
        tabReferences: webContext.tabReferences,
        arrangementHints: webContext.arrangementHints,
      } : null,
      source_type: isWebChords ? 'ai_web' : 'ai',
      edit_mode: 'ai',
      is_public: isPublic,
      visibility: isPublic ? 'public' : 'private',
      audit_status: isPublic ? 'pending' : 'private',
      favorite_count: 0,
      like_count: 0,
      comment_count: 0,
      view_count: 0,
      practice_count: 0,
      created_at: now,
      updated_at: now,
    }

    const songResult = await songs.add({ data })
    const nextGenerationQuota = Math.max(0, Number(user.generation_quota || 0) - 1)
    const nextTotalGenerated = Number(user.total_generated || 0) + 1
    const nextWorksCount = Number(user.works_count || 0) + 1

    await users.doc(user._id).update({
      data: {
        generation_quota: _.inc(-1),
        total_generated: _.inc(1),
        works_count: _.inc(1),
        updated_at: now,
      },
    })

    return {
      code: 0,
      data: {
        songId: songResult._id,
        title: data.title,
        style: data.style,
        song_key: data.song_key,
        bpm: data.bpm,
        capo: data.capo,
        difficulty: data.difficulty,
        strumming: data.strumming,
        chords: normalized.chords,
        sections: normalized.sections,
        practiceTips: normalized.practiceTips,
        source_type: data.source_type,
        user: {
          id: user._id,
          generation_quota: nextGenerationQuota,
          total_generated: nextTotalGenerated,
          works_count: nextWorksCount,
          membership_type: user.membership_type || 'free',
        },
      },
    }
  } catch (error) {
    console.error('ai-generate error:', error)
    return {
      code: 500,
      message: error?.message || 'AI 生成失败，请稍后再试',
    }
  }
}
