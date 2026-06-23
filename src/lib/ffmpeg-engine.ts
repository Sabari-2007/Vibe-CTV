import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

export interface RenderSlidesInput {
  imageUrls: string[]
  durations: number[]
  labels: string[]
}

export interface RenderTextInput {
  headline: string
  tagline: string
  featureBullets: string[]
  logoUrl: string | null
  bottomBanner: { companyName: string; websiteUrl: string; logoUrl: string }
  endScreen: { companyName: string; websiteUrl: string; accentColor: string; address: string; phone: string }
}

export interface RenderAudioInput {
  enabled: boolean
  genre: string | null
}

export type RenderProgressCallback = (percent: number, stage: string) => void

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<void> | null = null

export function getFFmpeg(): FFmpeg {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg()
  }
  return ffmpegInstance
}

export async function loadFFmpeg(onProgress?: RenderProgressCallback): Promise<void> {
  if (loadPromise) return loadPromise

  const ffmpeg = getFFmpeg()
  const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'

  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message)
  })

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(Math.round(progress * 100), 'Rendering video...')
    }
  })

  loadPromise = (async () => {
    if (onProgress) onProgress(10, 'Loading FFmpeg engine (~31MB)...')
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    if (onProgress) onProgress(100, 'FFmpeg ready')
  })()

  return loadPromise
}

export async function renderVideo(
  slides: RenderSlidesInput,
  text: RenderTextInput,
  audio: RenderAudioInput,
  onProgress: RenderProgressCallback
): Promise<Blob> {
  const ffmpeg = getFFmpeg()
  const totalSteps = slides.imageUrls.length + 3
  let step = 0

  const updateProgress = (stage: string) => {
    step++
    const pct = Math.round((step / totalSteps) * 100)
    onProgress(Math.min(pct, 95), stage)
  }

  const sanitize = (s: string) =>
    s.replace(/'/g, "'\\\\''").replace(/"/g, '\\"').replace(/:/g, '\\:').replace(/[/\\]/g, '_')

  // Step 1: Write each image to virtual FS
  onProgress(0, 'Downloading images...')
  for (let i = 0; i < slides.imageUrls.length; i++) {
    try {
      const resp = await fetch(slides.imageUrls[i])
      const blob = await resp.blob()
      const fileData = await fetchFile(blob)
      await ffmpeg.writeFile(`slide${i}.png`, fileData)
    } catch {
      const canvas = document.createElement('canvas')
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#22548A'
      ctx.fillRect(0, 0, 1920, 1080)
      ctx.fillStyle = '#ffffff'
      ctx.font = '48px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(slides.labels[i] || `Slide ${i + 1}`, 960, 540)
      const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'))
      const fileData = await fetchFile(blob)
      await ffmpeg.writeFile(`slide${i}.png`, fileData)
    }
    updateProgress(`Image ${i + 1}/${slides.imageUrls.length}`)
  }

  // Step 2: Apply text overlays via drawtext filter
  onProgress(0, 'Applying text overlays...')
  for (let i = 0; i < slides.imageUrls.length; i++) {
    const filters: string[] = []
    const duration = slides.durations[i] || 4

    // Logo overlay
    if (text.logoUrl && i === 0) {
      try {
        const logResp = await fetch(text.logoUrl)
        const logBlob = await logResp.blob()
        const logData = await fetchFile(logBlob)
        await ffmpeg.writeFile('logo.png', logData)
        filters.push(`[0]scale=60:60[logo]`)
        filters.push(`[logo]overlay=20:20[withlogo]`)
      } catch {}
    }

    // Headline
    if (text.headline) {
      const safeText = sanitize(text.headline)
      filters.push(
        `drawtext=text='${safeText}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h*0.65:shadowcolor=black@0.5:shadowx=2:shadowy=2`
      )
    }

    // Tagline
    if (text.tagline) {
      const safeTag = sanitize(text.tagline)
      filters.push(
        `drawtext=text='${safeTag}':fontcolor=white@0.8:fontsize=24:x=(w-text_w)/2:y=h*0.75:shadowcolor=black@0.5:shadowx=2:shadowy=2`
      )
    }

    // Feature bullets
    for (let b = 0; b < text.featureBullets.length && b < 3; b++) {
      if (i >= text.featureBullets.length) break
      const bullet = text.featureBullets[b] || text.featureBullets[0]
      const safeBullet = sanitize(bullet)
      const yPos = 82 + b * 5
      filters.push(
        `drawtext=text='${safeBullet}':fontcolor=white:fontsize=16:x=w*0.05:y=h*${yPos/100}:box=1:boxcolor=white@0.15:boxborderw=8`
      )
    }

    const filterStr = filters.join(',')
    const inputs = ['-i', `slide${i}.png`]

    if (filters.length > 0) {
      await ffmpeg.exec([
        ...inputs,
        '-vf', filterStr,
        '-y', `slide${i}_text.png`,
      ])
    } else {
      await ffmpeg.exec([
        ...inputs,
        '-y', `slide${i}_text.png`,
      ])
    }

    updateProgress(`Overlay ${i + 1}/${slides.imageUrls.length}`)
  }

  // Step 3: Create concat list and combine into video
  onProgress(0, 'Assembling video timeline...')
  let concatList = ''
  for (let i = 0; i < slides.imageUrls.length; i++) {
    const dur = slides.durations[i] || 4
    concatList += `file 'slide${i}_text.png'\nduration ${dur}\n`
  }

  await ffmpeg.writeFile('concat_list.txt', concatList)

  try {
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat_list.txt',
      '-vsync', 'vfr',
      '-pix_fmt', 'yuv420p',
      '-y', 'output.mp4',
    ])
  } catch {
    await ffmpeg.exec([
      '-framerate', '1',
      '-i', 'slide%d_text.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y', 'output.mp4',
    ])
  }

  updateProgress('Assembled video')

  // Step 4: Add end screen card as a separate slide
  onProgress(0, 'Adding end screen...')
  const endCanvas = document.createElement('canvas')
  endCanvas.width = 1920
  endCanvas.height = 1080
  const ectx = endCanvas.getContext('2d')!
  ectx.fillStyle = text.endScreen.accentColor || '#22548A'
  ectx.fillRect(0, 0, 1920, 1080)
  ectx.fillStyle = '#ffffff'
  ectx.font = 'bold 64px sans-serif'
  ectx.textAlign = 'center'
  ectx.fillText(text.endScreen.companyName || text.headline || 'Your Brand', 960, 450)
  ectx.font = '28px sans-serif'
  ectx.fillStyle = '#ffffffb0'
  ectx.fillText(text.endScreen.websiteUrl || '', 960, 520)
  if (text.endScreen.address) {
    ectx.font = '20px sans-serif'
    ectx.fillStyle = '#ffffff80'
    ectx.fillText(text.endScreen.address, 960, 580)
  }
  if (text.endScreen.phone) {
    ectx.font = '20px sans-serif'
    ectx.fillStyle = '#ffffff80'
    ectx.fillText(text.endScreen.phone, 960, 620)
  }
  const endBlob = await new Promise<Blob>((r) => endCanvas.toBlob((b) => r(b!), 'image/png'))
  const endFile = await fetchFile(endBlob)
  await ffmpeg.writeFile('end.png', endFile)
  await ffmpeg.exec([
    '-loop', '1',
    '-i', 'end.png',
    '-c:v', 'libx264',
    '-t', '4',
    '-pix_fmt', 'yuv420p',
    '-y', 'end.mp4',
  ])

  updateProgress('End screen done')

  // Step 5: Concatenate main video + end screen
  await ffmpeg.writeFile('final_list.txt', "file 'output.mp4'\nfile 'end.mp4'\n")
  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'final_list.txt',
    '-c', 'copy',
    '-y', 'final.mp4',
  ])

  let currentFile = 'final.mp4'

  // Step 6: Add bottom banner overlay (burned into video)
  if (text.bottomBanner.companyName) {
    const bannerFilters: string[] = []
    const btmText = sanitize(text.bottomBanner.companyName)
    bannerFilters.push(
      `drawtext=text='${btmText}':fontcolor=black:fontsize=22:x=w*0.05:y=h*0.93:box=1:boxcolor=white@0.95:boxborderw=10`
    )
    if (text.bottomBanner.websiteUrl) {
      const btmUrl = sanitize(text.bottomBanner.websiteUrl)
      bannerFilters.push(
        `drawtext=text='${btmUrl}':fontcolor=black@0.5:fontsize=16:x=w*0.6:y=h*0.93:box=1:boxcolor=white@0.95:boxborderw=10`
      )
    }

    if (text.bottomBanner.logoUrl) {
      try {
        const bLogResp = await fetch(text.bottomBanner.logoUrl)
        const bLogBlob = await bLogResp.blob()
        const bLogData = await fetchFile(bLogBlob)
        await ffmpeg.writeFile('banner_logo.png', bLogData)
        bannerFilters.push(`overlay=20:h-80`)
      } catch {}
    }

    const bfStr = bannerFilters.join(',')
    await ffmpeg.exec([
      '-i', currentFile,
      '-vf', bfStr,
      '-c:a', 'copy',
      '-y', 'banner.mp4',
    ])
    currentFile = 'banner.mp4'
    updateProgress('Bottom banner applied')
  }

  // Step 7: Add background music
  if (audio.enabled && audio.genre) {
    onProgress(0, 'Generating audio track...')
    const audioCtx = new AudioContext()
    const sampleRate = audioCtx.sampleRate
    const duration = getTotalDuration(slides.durations) + 4
    const numSamples = sampleRate * duration

    const frequencies = getGenreFrequencies(audio.genre)
    const buf = audioCtx.createBuffer(1, numSamples, sampleRate)
    const data = buf.getChannelData(0)

    const bpm = getGenreBPM(audio.genre)
    const beatMs = 60 / bpm
    const beatSamples = Math.floor(beatMs * sampleRate)

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate
      const beatIdx = Math.floor(t / beatMs) % frequencies.length
      const freq = frequencies[beatIdx]
      const envelope = Math.max(0, 1 - ((t % beatMs) / beatMs) * 2)
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.15
      data[i] += Math.sin(2 * Math.PI * freq * 0.5 * t) * envelope * 0.08
    }

    const wavBuffer = audioBufferToWav(buf)
    await ffmpeg.writeFile('music.wav', new Uint8Array(wavBuffer))

    try {
      await ffmpeg.exec([
        '-i', currentFile,
        '-i', 'music.wav',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        '-y', 'output_with_music.mp4',
      ])
      currentFile = 'output_with_music.mp4'
    } catch {
      // music failed, continue without
    }
    updateProgress('Audio added')
  }

  // Step 8: Read final video
  onProgress(96, 'Finalizing video...')
  const data = await ffmpeg.readFile(currentFile)
  const uint8 = data as Uint8Array
  const videoBlob = new Blob([uint8.buffer as ArrayBuffer], { type: 'video/mp4' })

  onProgress(100, 'Done')
  return videoBlob
}

function getTotalDuration(durations: number[]): number {
  return durations.reduce((s, d) => s + d, 0)
}

function getGenreBPM(genre: string): number {
  const map: Record<string, number> = {
    Corporate: 110, Rock: 140, Upbeat: 128, Cinematic: 80,
    Acoustic: 90, Electronic: 130, Ambient: 60,
  }
  return map[genre] || 110
}

function getGenreFrequencies(genre: string): number[] {
  const map: Record<string, number[]> = {
    Corporate: [261.63, 329.63, 293.66, 349.23, 261.63, 392, 349.23, 293.66],
    Rock: [110, 220, 146.83, 110, 164.81, 110, 196, 110],
    Upbeat: [440, 554.37, 659.25, 554.37, 440, 554.37, 783.99, 659.25],
    Cinematic: [130.81, 196, 261.63, 196, 164.81, 220, 293.66, 220],
    Acoustic: [392, 349.23, 329.63, 293.66, 261.63, 293.66, 329.63, 349.23],
    Electronic: [440, 55, 440, 55, 554.37, 55, 554.37, 55],
    Ambient: [220, 220, 196, 196, 174.61, 174.61, 164.81, 164.81],
  }
  return map[genre] || map.Corporate
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1
  const bitDepth = 16
  const data = buffer.getChannelData(0)
  const dataLength = data.length * (bitDepth / 8)
  const headerLength = 44
  const totalLength = headerLength + dataLength

  const arrayBuffer = new ArrayBuffer(totalLength)
  const view = new DataView(arrayBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalLength - 8, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true)
  view.setUint16(32, numChannels * (bitDepth / 8), true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
    offset += 2
  }

  return arrayBuffer
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
