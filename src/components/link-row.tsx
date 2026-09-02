import { useEffect, useState } from 'react'
import { createQrDataUrl } from '@/services/qr-service'
import type { LinkRowProps } from '@/types/components'

const QR_HOST = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')

export function LinkRow({ url, onEdit, onDisable, onDelete }: LinkRowProps) {
  const [qr, setQr] = useState('')
  const shortUrl = `${QR_HOST}/${url.url_id}`

  useEffect(() => { void createQrDataUrl(shortUrl, { foreground: url.qr_foreground, background: url.qr_background, logoUrl: url.qr_logo_url }).then(setQr) }, [shortUrl, url.qr_foreground, url.qr_background, url.qr_logo_url])

  return <article className="link-row"><div className="link-icon">↗</div><div className="link-detail"><h3>{url.name}</h3><p>{shortUrl}</p><small>{url.original_url}</small></div><div className="link-views"><strong>{url.view_count}</strong><span>scans</span></div><span className={`status-pill ${url.status !== 'active' ? 'disabled' : ''}`}>{url.status}</span><div className="row-actions"><button type="button" onClick={onEdit}>Edit</button><button type="button" onClick={onDisable} disabled={url.status !== 'active'}>Disable</button><button type="button" onClick={onDelete}>Delete</button>{qr && <a href={qr} download={`${url.url_id}.png`}>QR</a>}</div></article>
}
