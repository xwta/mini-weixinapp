export const FEATURES = {
  SHOW_COMMUNITY: false,
  SHOW_COMMENTS: false,
  SHOW_EXTERNAL_LINK: false,
  SHOW_DEBUG_INFO: false,
  ENABLE_TAB_SEARCH: true,
  ENABLE_IMAGE_PREVIEW: true,
  ENABLE_TEXT_IMPORT: true,
  ENABLE_AI_GENERATE: true,
  ENABLE_TUNER: true,
  ENABLE_ORDERS: false,
  ENABLE_NOTIFICATIONS: false,
  ENABLE_MEMBERSHIP: true
}

export function isFeatureEnabled(key: keyof typeof FEATURES) {
  return Boolean(FEATURES[key])
}
