export interface RecentSearchItem {
  keyword: string
  createdAt: number
}

export interface RecentImportItem {
  songId: string
  title: string
  artist?: string
  source?: string
  createdAt: number
}

const SEARCH_KEY = 'puling_recent_searches'
const IMPORT_KEY = 'puling_recent_imports'
const MAX_ITEMS = 12

function getStorage<T>(key: string, fallback: T): T {
  try {
    const value = uni.getStorageSync(key)
    if (!value) return fallback
    return Array.isArray(value) ? value as T : fallback
  } catch (_error) {
    return fallback
  }
}

function setStorage<T>(key: string, value: T) {
  try {
    uni.setStorageSync(key, value)
  } catch (_error) {}
}

export function getRecentSearches() {
  return getStorage<RecentSearchItem[]>(SEARCH_KEY, [])
}

export function saveRecentSearch(keyword = '') {
  const text = String(keyword || '').trim()
  if (!text) return
  const items = getRecentSearches()
    .filter((item) => item.keyword !== text)
  items.unshift({ keyword: text, createdAt: Date.now() })
  setStorage(SEARCH_KEY, items.slice(0, MAX_ITEMS))
}

export function clearRecentSearches() {
  setStorage(SEARCH_KEY, [])
}

export function getRecentImports() {
  return getStorage<RecentImportItem[]>(IMPORT_KEY, [])
}

export function saveRecentImport(item: Omit<RecentImportItem, 'createdAt'>) {
  if (!item.songId || !item.title) return
  const items = getRecentImports()
    .filter((old) => old.songId !== item.songId)
  items.unshift({ ...item, createdAt: Date.now() })
  setStorage(IMPORT_KEY, items.slice(0, MAX_ITEMS))
}

export function clearRecentImports() {
  setStorage(IMPORT_KEY, [])
}
