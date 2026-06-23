'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { loadFFmpeg, renderVideo, type RenderProgressCallback, type RenderSlidesInput, type RenderTextInput, type RenderAudioInput } from './ffmpeg-engine'

interface FFmpegStatus {
  loaded: boolean
  loading: boolean
  loadingProgress: number
  loadingStage?: string
  error: string | null
}

interface RenderStatus {
  rendering: boolean
  progress: number
  stage: string
  error: string | null
  resultBlob: Blob | null
  resultUrl: string | null
}

export function useFFmpeg() {
  const [status, setStatus] = useState<FFmpegStatus>({
    loaded: false,
    loading: false,
    loadingProgress: 0,
    error: null,
  })

  const [renderStatus, setRenderStatus] = useState<RenderStatus>({
    rendering: false,
    progress: 0,
    stage: '',
    error: null,
    resultBlob: null,
    resultUrl: null,
  })

  const prevResultUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (prevResultUrlRef.current) {
        URL.revokeObjectURL(prevResultUrlRef.current)
      }
    }
  }, [])

  const load = useCallback(async () => {
    if (status.loaded || status.loading) return

    setStatus((s) => ({ ...s, loading: true, error: null }))

    try {
      await loadFFmpeg((progress, stage) => {
        setStatus((s) => ({
          ...s,
          loadingProgress: progress,
          loadingStage: stage,
        }))
      })
      setStatus({ loaded: true, loading: false, loadingProgress: 100, error: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load FFmpeg'
      setStatus({ loaded: false, loading: false, loadingProgress: 0, error: msg })
    }
  }, [status.loaded, status.loading])

  const render = useCallback(async (
    slides: RenderSlidesInput,
    text: RenderTextInput,
    audio: RenderAudioInput
  ) => {
    setRenderStatus({
      rendering: true,
      progress: 0,
      stage: 'Starting...',
      error: null,
      resultBlob: null,
      resultUrl: null,
    })

    if (prevResultUrlRef.current) {
      URL.revokeObjectURL(prevResultUrlRef.current)
      prevResultUrlRef.current = null
    }

    try {
      const onProgress: RenderProgressCallback = (progress, stage) => {
        setRenderStatus((s) => ({ ...s, progress, stage }))
      }

      const blob = await renderVideo(slides, text, audio, onProgress)
      const url = URL.createObjectURL(blob)
      prevResultUrlRef.current = url

      setRenderStatus({
        rendering: false,
        progress: 100,
        stage: 'Complete',
        error: null,
        resultBlob: blob,
        resultUrl: url,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Render failed'
      setRenderStatus({
        rendering: false,
        progress: 0,
        stage: 'Failed',
        error: msg,
        resultBlob: null,
        resultUrl: null,
      })
    }
  }, [])

  const reset = useCallback(() => {
    if (prevResultUrlRef.current) {
      URL.revokeObjectURL(prevResultUrlRef.current)
      prevResultUrlRef.current = null
    }
    setRenderStatus({
      rendering: false,
      progress: 0,
      stage: '',
      error: null,
      resultBlob: null,
      resultUrl: null,
    })
  }, [])

  return { status, renderStatus, load, render, reset }
}
