'use client'

import { useState, useEffect } from 'react'
import { useStudioState } from '@/lib/state-context'
import { useFFmpeg } from '@/lib/use-ffmpeg'
import { recordCanvasVideo } from '@/lib/canvas-recorder'

interface ExportModalProps {
  onClose: () => void
}

export function ExportModal({ onClose }: ExportModalProps) {
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'ready'>('idle')
  const [copied, setCopied] = useState(false)
  const [canvasProgress, setCanvasProgress] = useState(0)
  const [canvasRendering, setCanvasRendering] = useState(false)
  const [canvasResultUrl, setCanvasResultUrl] = useState<string | null>(null)
  const [canvasError, setCanvasError] = useState<string | null>(null)
  const { state } = useStudioState()
  const { status: ffStatus, renderStatus: ffRender, load: loadFF, render: renderVideo } = useFFmpeg()

  useEffect(() => {
    const prepareTimer = setTimeout(() => {
      setPhase('preparing')
    }, 500)
    return () => clearTimeout(prepareTimer)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // silent
    }
  }

  const handleRenderWithFFmpeg = async () => {
    if (!ffStatus.loaded) {
      await loadFF()
    }
    if (ffStatus.error) return

    const slidesInput = {
      imageUrls: state.slides.map((s) => s.imageUrl),
      durations: state.slides.map((s) => Math.max(1, s.endTime - s.startTime)),
      labels: state.slides.map((s) => s.label),
    }

    const textInput = {
      headline: state.businessName,
      tagline: state.tagline,
      featureBullets: state.featureBullets,
      logoUrl: state.logoUrl,
      bottomBanner: {
        companyName: state.bottomBanner.companyName,
        websiteUrl: state.bottomBanner.websiteUrl,
        logoUrl: state.bottomBanner.logoUrl,
      },
      endScreen: {
        companyName: state.endScreen.companyName,
        websiteUrl: state.endScreen.websiteUrl,
        accentColor: state.endScreen.accentColor,
        address: state.endScreen.address,
        phone: state.endScreen.phone,
      },
    }

    const audioInput = {
      enabled: state.music.enabled,
      genre: state.music.enabled ? state.music.genre : null,
    }

    await renderVideo(slidesInput, textInput, audioInput)
  }

  const handleCanvasRender = async () => {
    setCanvasRendering(true)
    setCanvasError(null)
    setCanvasResultUrl(null)

    try {
      const slides = state.slides.map(s => ({
        imageUrl: s.imageUrl,
        label: s.label,
        duration: Math.max(1, s.endTime - s.startTime),
      }))

      const blob = await recordCanvasVideo({
        slides,
        layers: state.layers,
        audioFile: state.music.audioFile,
        voiceFile: state.voice.audioFile,
        onProgress: (pct, stage) => {
          setCanvasProgress(pct)
        },
      })

      const url = URL.createObjectURL(blob)
      setCanvasResultUrl(url)
    } catch (err) {
      setCanvasError(err instanceof Error ? err.message : 'Canvas recording failed')
    } finally {
      setCanvasRendering(false)
    }
  }

  const isRendering = ffRender.rendering || canvasRendering
  const isLoaded = ffStatus.loaded
  const hasResult = ffRender.resultUrl !== null || canvasResultUrl !== null

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[520px] bg-[#1a1a25] rounded-2xl border border-white/10 shadow-2xl p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          {isRendering ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {ffRender.rendering ? 'Rendering with FFmpeg...' : 'Recording canvas video...'}
              </h2>
              <p className="text-sm text-white/50 mb-6">
                {ffRender.rendering ? ffRender.stage : `Rendering ${canvasProgress}%`}
              </p>
              <div className="w-full bg-white/10 rounded-full h-2.5 mb-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${ffRender.rendering ? ffRender.progress : canvasProgress}%` }}
                />
              </div>
              <p className="text-xs text-white/40 font-mono">{ffRender.rendering ? ffRender.progress : canvasProgress}%</p>
              {(ffRender.error || canvasError) && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {ffRender.error || canvasError}
                </div>
              )}
            </>
          ) : hasResult ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Your video is ready!</h2>
              <p className="text-sm text-white/50 mb-6">Rendered entirely in your browser — no server costs.</p>

              <div className="mb-6 rounded-xl overflow-hidden bg-black border border-white/10">
                <video
                  src={(ffRender.resultUrl || canvasResultUrl)!}
                  controls
                  className="w-full"
                  style={{ maxHeight: '300px' }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-all"
                >
                  {copied ? 'Copied!' : 'Copy sharing link'}
                </button>
                <a
                  href={(ffRender.resultUrl || canvasResultUrl)!}
                  download={`adstudio-video.${ffRender.resultUrl ? 'mp4' : 'webm'}`}
                  className="flex-1 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:brightness-110 transition-all text-center"
                >
                  Download {ffRender.resultUrl ? 'MP4' : 'WEBM'}
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Your video is being prepared!</h2>
              <p className="text-sm text-white/50 leading-relaxed mb-6">
                While you wait, share it with your team or on social media using this link.
              </p>
              <p className="text-xs text-white/30 leading-relaxed mb-6">
                Share your video to gather feedback, refine it with valuable external perspectives,
                and attract potential new customers.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleCopy}
                  className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-all"
                >
                  {copied ? 'Copied!' : 'Copy sharing link'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-[#1a1a25] text-white/30">render options</span>
                  </div>
                </div>

                <button
                  onClick={handleCanvasRender}
                  disabled={canvasRendering}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25"
                >
                  {canvasRendering ? 'Recording...' : 'Record Canvas (No FFmpeg needed)'}
                </button>

                <button
                  onClick={handleRenderWithFFmpeg}
                  disabled={ffStatus.error !== null}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-purple-600 text-white font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-accent/25"
                >
                  {!isLoaded && !ffStatus.loading
                    ? 'Render in Browser (Free)'
                    : ffStatus.loading
                      ? 'Loading FFmpeg engine...'
                      : 'Render Video (100% Browser)'}
                </button>

                {ffStatus.loading && (
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${ffStatus.loadingProgress}%` }} />
                  </div>
                )}

                {ffStatus.error && (
                  <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                    FFmpeg failed to load: {ffStatus.error}. The page may need to be served with
                    COOP/COEP headers (requires HTTPS or localhost). Try refreshing.
                  </div>
                )}

                <p className="text-[10px] text-white/20 leading-relaxed">
                  Renders entirely in your browser using FFmpeg.wasm. No data leaves your device.
                  Processing time depends on your CPU. ~31MB WASM download on first use.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
