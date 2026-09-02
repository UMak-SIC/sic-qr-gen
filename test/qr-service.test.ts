import { describe, expect, it, vi } from 'vitest'

const { toDataURL } = vi.hoisted(() => ({ toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') }))
vi.mock('qrcode', () => ({ default: { toDataURL } }))

import { createQrDataUrl, downloadQrDataUrl } from '@/services/qr-service'

describe('QR service', () => {
  it('encodes the canonical short-link payload unchanged', async () => {
    const payload = 'https://sic-qr-gen.vercel.app/AbcDefG'

    await expect(createQrDataUrl(payload)).resolves.toBe('data:image/png;base64,qr')
    expect(toDataURL).toHaveBeenCalledWith(payload, { margin: 1, width: 560, errorCorrectionLevel: 'M' })
  })

  it('keeps the base QR when the optional logo cannot load', async () => {
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({}) }) })
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null
      onerror: ((event?: Event) => void) | null = null
      set src(value: string) { value === 'broken-logo' ? this.onerror?.() : this.onload?.() }
    })

    const onLogoError = vi.fn()

    await expect(createQrDataUrl('https://sic-qr-gen.vercel.app/AbcDefG', { logoUrl: 'broken-logo' }, onLogoError)).resolves.toBe('data:image/png;base64,qr')
    expect(onLogoError).toHaveBeenCalledOnce()
  })

  it('shares the QR file on mobile browsers that support file sharing', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare: () => true, share })

    await downloadQrDataUrl('data:image/png;base64,aGVsbG8=', 'link.png')

    expect(share).toHaveBeenCalledOnce()
    expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File)
    expect(share.mock.calls[0][0].files[0].name).toBe('link.png')
  })
})
