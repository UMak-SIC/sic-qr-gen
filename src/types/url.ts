export interface UrlRecord {
  id: string
  url_id: string
  name: string
  original_url: string
  view_count: number
  status: 'active' | 'disabled'
  expires_at: string | null
  qr_foreground: string
  qr_background: string
  qr_logo_url: string | null
}

export interface UrlInput {
  name: string
  originalUrl: string
  expiresAt: string | null
  qrForeground: string
  qrBackground: string
  qrLogoFile: File | null
  qrLogoUrl: string | null
}

export type UrlStatus = 'active' | 'disabled' | 'expired'

export function getUrlStatus(url: Pick<UrlRecord, 'status' | 'expires_at'>, now = new Date()): UrlStatus {
  if (url.status === 'disabled') return 'disabled'
  return url.expires_at && new Date(url.expires_at) <= now ? 'expired' : 'active'
}
