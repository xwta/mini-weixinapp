import { request } from './provider'

export async function toggleLike(songId: string | number) {
  const result = await request('interactions', {
    action: 'toggleLike',
    song_id: songId,
  })
  return result?.data || result
}

export async function toggleFavorite(songId: string | number) {
  const result = await request('interactions', {
    action: 'toggleFavorite',
    song_id: songId,
  })
  return result?.data || result
}
