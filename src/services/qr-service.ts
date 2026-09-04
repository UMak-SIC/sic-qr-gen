import QRCode from 'qrcode'

export interface QrStyle {
  foreground?: string
  background?: string
  logoUrl?: string | null
}

export async function createQrDataUrl(value: string, style: QrStyle = {}, onLogoError?: () => void) {
  const dataUrl = await QRCode.toDataURL(value, {
    margin: 1,
    width: 560,
    errorCorrectionLevel: style.logoUrl ? 'H' : 'M',
    ...(style.foreground || style.background ? { color: { dark: style.foreground ?? '#176b4f', light: style.background ?? '#f9f9ee' } } : {}),
  })
  if (!style.logoUrl) return dataUrl

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 560
    canvas.height = 560
    const context = canvas.getContext('2d')
    if (!context) return dataUrl
    const qrImage = await loadImage(dataUrl)
    const logo = await loadImage(style.logoUrl)
    context.drawImage(qrImage, 0, 0, 560, 560)
    const size = 112
    const x = (560 - size) / 2
    context.fillStyle = style.background ?? '#f9f9ee'
    context.beginPath()
    context.roundRect(x - 10, x - 10, size + 20, size + 20, 18)
    context.fill()
    context.save()
    context.beginPath()
    context.arc(280, 280, size / 2, 0, Math.PI * 2)
    context.clip()
    const logoWidth = logo.naturalWidth || logo.width
    const logoHeight = logo.naturalHeight || logo.height
    const scale = Math.min(size / logoWidth, size / logoHeight)
    const width = logoWidth * scale
    const height = logoHeight * scale
    context.drawImage(logo, 280 - width / 2, 280 - height / 2, width, height)
    context.restore()
    return canvas.toDataURL('image/png')
  } catch {
    onLogoError?.()
    return dataUrl
  }
}

export async function downloadQrDataUrl(dataUrl: string, filename: string) {
  const [header, encoded] = dataUrl.split(',', 2)
  const mimeType = header.match(/^data:(.*?);base64$/)?.[1] ?? 'image/png'
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    if (/^https?:\/\//i.test(source)) image.crossOrigin = 'anonymous'
    image.src = source
  })
}
