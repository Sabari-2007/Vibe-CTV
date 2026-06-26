import QRCode from 'qrcode'

export function generateQRDataUrl(text: string, size: number = 200): string {
  if (typeof window === 'undefined') return ''

  const canvas = document.createElement('canvas')
  canvas.width = size * 4
  canvas.height = size * 4

  try {
    QRCode.toCanvas(canvas, text, {
      width: size * 4,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })

    const scaledCanvas = document.createElement('canvas')
    scaledCanvas.width = size
    scaledCanvas.height = size
    const ctx = scaledCanvas.getContext('2d')
    if (!ctx) return ''

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(canvas, 0, 0, size, size)
    return scaledCanvas.toDataURL('image/png')
  } catch {
    return ''
  }
}
