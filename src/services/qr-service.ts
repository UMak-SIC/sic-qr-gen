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
    context.drawImage(logo, x, x, size, size)
    context.restore()
    return canvas.toDataURL('image/png')
  } catch {
    onLogoError?.()
    return dataUrl
  }
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.crossOrigin = 'anonymous'
    image.src = source
  })
}
