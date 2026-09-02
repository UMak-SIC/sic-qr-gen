import { describe, expect, it, vi } from 'vitest'

const { toDataURL } = vi.hoisted(() => ({ toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') }))
vi.mock('qrcode', () => ({ default: { toDataURL } }))

import { createQrDataUrl } from '@/services/qr-service'

describe('QR service', () => {
  it('encodes the canonical short-link payload unchanged', async () => {
    const payload = 'https://sic-qr-gen.vercel.app/AbcDefG'

    await expect(createQrDataUrl(payload)).resolves.toBe('data:image/png;base64,qr')
    expect(toDataURL).toHaveBeenCalledWith(payload, { margin: 1, width: 560, errorCorrectionLevel: 'M' })
  })
})
