import { getSupabaseClient } from '@/lib/supabase'
import type { UrlInput, UrlRecord } from '@/types/url'

const URL_COLUMNS = 'id,url_id,name,original_url,view_count,status,expires_at,qr_foreground,qr_background,qr_logo_url'

export async function uploadQrLogo(file: File, userId: string) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const size = Math.min(bitmap.width, bitmap.height, 512)
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d')?.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, size, size)
  bitmap.close()
  const blob = await compressWebp(canvas)
  const path = `${userId}/${crypto.randomUUID()}.webp`
  const supabase = getSupabaseClient()
  const { error } = await supabase.storage.from('qr-logos').upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw error
  return supabase.storage.from('qr-logos').getPublicUrl(path).data.publicUrl
}

function compressWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    const attempt = (quality: number) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Could not compress logo.'))
      if (blob.size <= 80_000 || quality <= 0.45) return resolve(blob)
      attempt(quality - 0.1)
    }, 'image/webp', quality)
    attempt(0.8)
  })
}

export function validateHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname)
  } catch {
    return false
  }
}

export async function listUrls() {
  const { data, error } = await getSupabaseClient()
    .from('urls')
    .select(URL_COLUMNS)
  if (error) throw error
  return data as UrlRecord[]
}

export async function createUrl(input: UrlInput) {
  if (!validateHttpsUrl(input.originalUrl)) throw new Error('Enter an absolute HTTPS URL.')

  const { data, error } = await getSupabaseClient()
    .from('urls')
    .insert({ name: input.name.trim() || 'Untitled link', original_url: input.originalUrl, expires_at: input.expiresAt, qr_foreground: input.qrForeground, qr_background: input.qrBackground, qr_logo_url: input.qrLogoUrl })
    .select(URL_COLUMNS)
    .single()
  if (error) throw error
  return data as UrlRecord
}

export async function updateUrl(id: string, input: UrlInput) {
  if (!validateHttpsUrl(input.originalUrl)) throw new Error('Enter an absolute HTTPS URL.')
  const { data, error } = await getSupabaseClient()
    .from('urls')
    .update({ name: input.name.trim() || 'Untitled link', original_url: input.originalUrl, expires_at: input.expiresAt, qr_foreground: input.qrForeground, qr_background: input.qrBackground, qr_logo_url: input.qrLogoUrl })
    .eq('id', id)
    .select(URL_COLUMNS)
    .single()
  if (error) throw error
  return data as UrlRecord
}

export async function disableUrl(id: string) {
  const { error } = await getSupabaseClient().from('urls').update({ status: 'disabled' }).eq('id', id)
  if (error) throw error
}

export async function deleteUrl(id: string) {
  const { error } = await getSupabaseClient().rpc('delete_url', { p_id: id })
  if (error) throw error
}

export async function resolveUrl(code: string) {
  const { data, error } = await getSupabaseClient().rpc('resolve_url', { p_url_id: code })
  if (error || !data) return null
  return typeof data === 'string' ? data : null
}
