export function generateQRDataUrl(text: string, size: number = 200): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const modules = generateQRModules(text)
  const moduleCount = modules.length
  const moduleSize = size / moduleCount

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = '#000000'
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules[row][col]) {
        ctx.fillRect(
          col * moduleSize,
          row * moduleSize,
          Math.ceil(moduleSize),
          Math.ceil(moduleSize)
        )
      }
    }
  }

  return canvas.toDataURL('image/png')
}

function generateQRModules(text: string): boolean[][] {
  const size = 21
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  const finderPattern = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ]

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      modules[r][c] = finderPattern[r][c] === 1
      modules[r][size - 7 + c] = finderPattern[r][c] === 1
      modules[size - 7 + r][c] = finderPattern[r][c] === 1
    }
  }

  const data = text.split('').map(c => c.charCodeAt(0))
  let idx = 0
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules[row][col]) continue
      if (row < 7 || col < 7) continue
      if (row < 7 && col > size - 8) continue
      if (row > size - 8 && col < 7) continue

      const bit = data[Math.floor(idx / 8)] & (1 << (7 - (idx % 8)))
      modules[row][col] = bit !== 0
      idx++
    }
  }

  return modules
}
