'use client'

export interface CanvasRecordInput {
  slides: { imageUrl: string; label: string; duration: number }[]
  layers: { type: 'text' | 'image'; content: string; x: number; y: number; width: number; height: number; opacity: number; rotation: number; fontSize?: number; color?: string }[]
  audioFile?: { dataUrl: string } | null
  voiceFile?: { dataUrl: string } | null
  onProgress: (percent: number, stage: string) => void
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

export async function recordCanvasVideo(
  input: CanvasRecordInput,
  width = 1920,
  height = 1080,
  fps = 30
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const stream = canvas.captureStream(fps)

  input.onProgress(5, 'Loading images...')

  const slideImages = new Map<string, HTMLImageElement>()
  const layerImages = new Map<string, HTMLImageElement>()

  const imageLoads: Promise<void>[] = []

  for (const slide of input.slides) {
    if (slide.imageUrl) {
      imageLoads.push(
        loadImage(slide.imageUrl).then(img => { slideImages.set(slide.imageUrl, img) }).catch(() => {})
      )
    }
  }

  for (const layer of input.layers) {
    if (layer.type === 'image' && layer.content) {
      imageLoads.push(
        loadImage(layer.content).then(img => { layerImages.set(layer.content, img) }).catch(() => {})
      )
    }
  }

  await Promise.all(imageLoads)

  let audioCtx: AudioContext | null = null

  if (input.audioFile || input.voiceFile) {
    try {
      audioCtx = new AudioContext()
      const destination = audioCtx.createMediaStreamDestination()
      const audioTrack = destination.stream.getAudioTracks()[0]
      if (audioTrack) stream.addTrack(audioTrack)

      const files = [input.audioFile, input.voiceFile].filter(Boolean) as { dataUrl: string }[]
      for (const file of files) {
        const resp = await fetch(file.dataUrl)
        const arrayBuffer = await resp.arrayBuffer()
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        const source = audioCtx.createBufferSource()
        source.buffer = audioBuffer
        source.connect(destination)
        source.start()
      }
    } catch {
      audioCtx?.close()
      audioCtx = null
    }
  }

  const totalDuration = input.slides.reduce((sum, s) => sum + s.duration, 0) + 4
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
  const chunks: Blob[] = []

  return new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      audioCtx?.close()
      resolve(blob)
    }

    recorder.onerror = () => {
      audioCtx?.close()
      reject(new Error('MediaRecorder error'))
    }

    input.onProgress(10, 'Starting recording...')
    recorder.start()

    const startTime = performance.now()
    let stopped = false

    function drawFrame() {
      const elapsed = (performance.now() - startTime) / 1000
      const progress = Math.min(elapsed / totalDuration, 1)

      input.onProgress(Math.round(progress * 100), 'Recording canvas video...')

      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, width, height)

      let accumTime = 0
      let currentSlide = input.slides[0]

      for (const slide of input.slides) {
        if (elapsed >= accumTime && elapsed < accumTime + slide.duration) {
          currentSlide = slide
          break
        }
        accumTime += slide.duration
      }

      if (currentSlide.imageUrl) {
        const img = slideImages.get(currentSlide.imageUrl)
        if (img) {
          ctx.drawImage(img, 0, 0, width, height)
        } else {
          ctx.fillStyle = '#1a1a25'
          ctx.fillRect(0, 0, width, height)
        }
      }

      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, 0, width, 80)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(currentSlide.label || '', 40, 50)

      for (const layer of input.layers) {
        ctx.save()
        ctx.globalAlpha = layer.opacity
        ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
        ctx.rotate((layer.rotation * Math.PI) / 180)
        ctx.translate(-(layer.x + layer.width / 2), -(layer.y + layer.height / 2))

        if (layer.type === 'text') {
          ctx.fillStyle = layer.color || '#ffffff'
          ctx.font = `bold ${layer.fontSize || 32}px sans-serif`
          ctx.shadowColor = 'rgba(0,0,0,0.5)'
          ctx.shadowBlur = 8
          ctx.fillText(layer.content, layer.x, layer.y + (layer.fontSize || 32))
        } else {
          const layerImg = layerImages.get(layer.content)
          if (layerImg) {
            ctx.drawImage(layerImg, layer.x, layer.y, layer.width, layer.height)
          }
        }
        ctx.restore()
      }

      if (elapsed < totalDuration) {
        requestAnimationFrame(drawFrame)
      } else if (!stopped) {
        stopped = true
        recorder.stop()
      }
    }

    requestAnimationFrame(drawFrame)
  })
}
