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
    const images: { crossOrigin: string }[] = []
    vi.stubGlobal('Image', class {
      crossOrigin = ''
      onload: (() => void) | null = null
      onerror: ((event?: Event) => void) | null = null
      constructor() { images.push(this) }
      set src(value: string) { value === 'broken-logo' ? this.onerror?.() : this.onload?.() }
    })

    const onLogoError = vi.fn()

    await expect(createQrDataUrl('https://sic-qr-gen.vercel.app/AbcDefG', { logoUrl: 'broken-logo' }, onLogoError)).resolves.toBe('data:image/png;base64,qr')
    expect(onLogoError).toHaveBeenCalledOnce()
    expect(images[0].crossOrigin).toBe('')
  })

  it('shares the QR file on mobile browsers that support file sharing', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', canShare: () => true, share })

    await downloadQrDataUrl('data:image/png;base64,aGVsbG8=', 'link.png')

    expect(share).toHaveBeenCalledOnce()
    expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File)
    expect(share.mock.calls[0][0].files[0].name).toBe('link.png')
  })

  it('downloads instead of opening the share sheet on Windows', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const click = vi.fn()
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', canShare: () => true, share })
    vi.stubGlobal('document', { createElement: () => ({ click }) })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:qr', revokeObjectURL: vi.fn() })

    await downloadQrDataUrl('data:image/png;base64,aGVsbG8=', 'link.png')

    expect(share).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledOnce()
  })
})
