export interface User {
  id: string | number
  nickname?: string
  avatar_url?: string
  membership_type: string
  generation_quota: number
  daily_free_quota: number
  total_generated: number
  created_at?: string
}

export interface SongLine {
  chordLine?: string
  lyricLine: string
}

export interface SongSection {
  name: string
  lines: SongLine[]
}

export interface AiSongResult {
  songId?: string | number
  title: string
  style: string
  key: string
  bpm: number
  capo: string
  difficulty: string
  strumming: string
  chords: string[]
  sections: SongSection[]
  practiceTips: string[]
}

export interface Song {
  id: string | number
  user_id?: string | number
  title: string
  author_name?: string
  artist_name?: string
  style?: string
  song_key?: string
  bpm?: number
  capo?: string
  difficulty?: string
  strumming?: string
  raw_text?: string
  chords_json?: string[]
  tags_json?: string[]
  content_json?: any
  source_type: string
  edit_mode?: string
  visibility?: string
  is_public: boolean
  audit_status: string
  favorite_count: number
  like_count?: number
  share_count?: number
  comment_count?: number
  view_count: number
  practice_count?: number
  created_at: string
}

export interface PageData<T> {
  total: number
  page: number
  page_size: number
  items: T[]
}
