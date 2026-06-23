'use client'

import { useRef, useEffect } from 'react'

interface WaveformViewerProps {
  waveform: number[]
  color?: string
  height?: number
  className?: string
}

export function WaveformViewer({
  waveform,
  color = '#22c55e',
  height = 48,
  className = '',
}: WaveformViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || waveform.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth * dpr
    const h = height * dpr
    canvas.width = w
    canvas.height = h
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, canvas.clientWidth, height)

    const centerY = height / 2
    const step = Math.max(1, Math.floor(waveform.length / canvas.clientWidth))

    for (let x = 0; x < canvas.clientWidth; x++) {
      const idx = Math.min(Math.floor(x * step), waveform.length - 1)
      const val = waveform[idx] || 0
      const barHeight = Math.max(1, Math.abs(val) * (height * 0.8))
      const alpha = 0.4 + Math.abs(val) * 0.6

      ctx.fillStyle = color
      ctx.globalAlpha = alpha
      ctx.fillRect(x, centerY - barHeight / 2, 1, barHeight)
    }
    ctx.globalAlpha = 1
  }, [waveform, color, height])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded ${className}`}
      style={{ height: `${height}px` }}
    />
  )
}

export async function generateWaveform(
  file: File,
  sampleCount = 200
): Promise<number[]> {
  const arrayBuffer = await file.arrayBuffer()
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  const channelData = audioBuffer.getChannelData(0)
  audioCtx.close()

  const samples: number[] = []
  const blockSize = Math.max(1, Math.floor(channelData.length / sampleCount))

  for (let i = 0; i < sampleCount; i++) {
    const start = i * blockSize
    let sum = 0
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j] || 0)
    }
    samples.push(sum / blockSize)
  }

  const maxVal = Math.max(...samples, 0.01)
  return samples.map(s => s / maxVal)
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
