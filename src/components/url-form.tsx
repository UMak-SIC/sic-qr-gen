import { useEffect, useState } from 'react'
import { expiryInputToIso, formatExpiryInput, validateHttpsUrl, uploadQrLogo } from '@/services/url-service'
import { createQrDataUrl } from '@/services/qr-service'
import type { UrlFormProps } from '@/types/components'

export function UrlForm({ initial, userId, onCancel, onSave }: UrlFormProps & { userId: string }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [originalUrl, setOriginalUrl] = useState(initial?.original_url ?? '')
  const [expiresAt, setExpiresAt] = useState(formatExpiryInput(initial?.expires_at ?? null))
  const [saving, setSaving] = useState(false)
  const [foreground, setForeground] = useState(initial?.qr_foreground ?? '#176b4f')
  const [background, setBackground] = useState(initial?.qr_background ?? '#f9f9ee')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState(initial?.qr_logo_url ?? '')
  const [preview, setPreview] = useState('')
  const invalid = originalUrl.length > 0 && !validateHttpsUrl(originalUrl)

  useEffect(() => {
    if (!originalUrl) return
    const shortUrl = `${(import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')}/${initial?.url_id ?? 'preview'}`
    void createQrDataUrl(shortUrl, { foreground, background, logoUrl }).then(setPreview)
  }, [originalUrl, foreground, background, logoUrl, initial?.url_id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const uploadedLogo = logoFile ? await uploadQrLogo(logoFile, userId) : logoUrl || null
      await onSave({ name, originalUrl, expiresAt: expiryInputToIso(expiresAt), qrForeground: foreground, qrBackground: background, qrLogoFile: null, qrLogoUrl: uploadedLogo })
    } finally {
      setSaving(false)
    }
  }

  return <div className="form-backdrop"><form className={`modal-form ${initial ? 'editing' : ''}`} role="dialog" aria-modal="true" onSubmit={(event) => void submit(event)}><div className="section-heading"><button className="close-button" type="button" onClick={onCancel} aria-label="Close link form">×</button></div><div className="form-grid"><div><label htmlFor="name">Link name</label><input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="SIC General Assembly" /><label htmlFor="destination">Destination URL</label><input id="destination" type="url" value={originalUrl} onChange={(event) => { setOriginalUrl(event.target.value); if (!event.target.value) setPreview('') }} placeholder="https://your-link.com" required aria-invalid={invalid} /><p className="helper-text">Use an absolute HTTPS URL.</p><label htmlFor="expires">Expires at <span>(optional)</span></label><input id="expires" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} min={formatExpiryInput(new Date().toISOString())} /></div><aside className="qr-preview"><p className="tiny-label">LIVE PREVIEW</p>{preview ? <img src={preview} alt="Styled QR code preview" /> : <div className="preview-placeholder">Your QR appears here</div>}<p>Scannable at every step.</p></aside></div><fieldset className="qr-style"><legend>QR styling</legend><div className="color-controls"><label htmlFor="foreground">Code color<input id="foreground" type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} /></label><label htmlFor="background">Background<input id="background" type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label></div><label htmlFor="logo">Center image <span>(optional, WebP compressed)</span></label><input id="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; setLogoFile(file); if (file) setLogoUrl(URL.createObjectURL(file)) }} /></fieldset><div className="form-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit" disabled={saving || invalid}>{saving ? 'Saving...' : initial ? 'Save changes' : 'Create QR link'}</button></div></form></div>
}
