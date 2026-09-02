import { useEffect, useState } from 'react'
import { Ellipsis, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { createQrDataUrl, downloadQrDataUrl } from '@/services/qr-service'
import type { LinkRowProps } from '@/types/components'
import { getUrlStatus } from '@/types/url'

const QR_HOST = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')

export function LinkRow({ url, onEdit, onToggleStatus, onDelete }: LinkRowProps) {
  const [qr, setQr] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState(false)
  const shortUrl = `${QR_HOST}/${url.url_id}`
  const status = getUrlStatus(url)

  useEffect(() => {
    let active = true
    setQr('')
    void createQrDataUrl(shortUrl, { foreground: url.qr_foreground, background: url.qr_background, logoUrl: url.qr_logo_url }, () => { if (active) toast.warning('Center image could not be loaded. The QR was created without it.') })
      .then((dataUrl) => { if (active) setQr(dataUrl) })
      .catch(() => { if (active) toast.error('Could not generate this QR code.') })
    return () => { active = false }
  }, [shortUrl, url.qr_foreground, url.qr_background, url.qr_logo_url])

  const download = () => { void downloadQrDataUrl(qr, `${url.url_id}.png`).catch(() => toast.error('Could not download this QR code.')) }

  return <><article className="link-row"><div className={`link-icon ${status}`} role="img" aria-label={`${status} link`} title={`${status} link`}><Link2 size={16} strokeWidth={2.25} /></div><div className="link-detail"><h3>{url.name}</h3><p>{shortUrl}</p><small>{url.original_url}</small></div><div className="link-views"><strong>{url.view_count}</strong><span>scans</span></div><div className="row-actions desktop-actions"><button type="button" onClick={onEdit}>Edit</button><button type="button" onClick={onToggleStatus}>{url.status === 'disabled' ? 'Enable' : 'Disable'}</button><button type="button" onClick={onDelete}>Delete</button>{qr && <button type="button" onClick={() => setShowQr(true)}>View QR</button>}</div><div className="mobile-actions"><button className="mobile-actions-trigger" type="button" aria-label={`Show actions for ${url.name}`} aria-expanded={showMobileActions} aria-controls={`mobile-actions-${url.id}`} onClick={() => setShowMobileActions((visible) => !visible)}><Ellipsis size={22} strokeWidth={2} /></button>{showMobileActions && <div className="mobile-actions-menu" id={`mobile-actions-${url.id}`} role="menu"><button type="button" role="menuitem" onClick={onEdit}>Edit</button><button type="button" role="menuitem" onClick={onToggleStatus}>{url.status === 'disabled' ? 'Enable' : 'Disable'}</button><button type="button" role="menuitem" onClick={onDelete}>Delete</button>{qr && <button type="button" role="menuitem" onClick={() => setShowQr(true)}>View QR</button>}</div>}</div></article>{showQr && qr && <div className="form-backdrop" role="presentation" onMouseDown={() => setShowQr(false)}><section className="qr-dialog" role="dialog" aria-modal="true" aria-labelledby={`qr-title-${url.id}`} onMouseDown={(event) => event.stopPropagation()}><button className="close-button" type="button" onClick={() => setShowQr(false)} aria-label="Close QR preview">×</button><p className="eyebrow">QR CODE</p><h2 id={`qr-title-${url.id}`}>{url.name}</h2><img src={qr} alt={`QR code for ${url.name}`} /><button className="primary-button" type="button" onClick={download}>Download PNG</button></section></div>}</>
}
