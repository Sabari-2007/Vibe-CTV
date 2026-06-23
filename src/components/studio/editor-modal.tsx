'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useStudioState } from '@/lib/state-context'
import type { Slide } from '@/lib/ad-studio-types'
import { MUSIC_GENRES, VOICE_PROFILES_EXTENDED, FREE_STOCK_SITES, PAID_STOCK_SITES } from '@/lib/ad-studio-types'
import { generateQRDataUrl } from '@/lib/qrcode'
import { audioGen } from '@/lib/audio-gen'
import { WaveformViewer, generateWaveform, readFileAsDataURL } from '@/components/studio/waveform-viewer'
import { LivePreview } from './live-preview'
import { TimelineBar } from './timeline-bar'
import { ExportModal } from './export-modal'

type TabId = 'slideshow' | 'bottom-banner' | 'end-screen' | 'qr-code' | 'music' | 'voice-script' | 'layers' | 'ai-input'

interface TabDef {
  id: TabId
  label: string
  icon: string
}

const TABS: TabDef[] = [
  { id: 'slideshow', label: 'Slideshow', icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z' },
  { id: 'bottom-banner', label: 'Bottom banner', icon: 'M9.75 17.25v-.75a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v.75M9.75 17.25h-3a1.5 1.5 0 01-1.5-1.5v-9a1.5 1.5 0 011.5-1.5h7.5a1.5 1.5 0 011.5 1.5v3' },
  { id: 'end-screen', label: 'End screen', icon: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12' },
  { id: 'qr-code', label: 'QR code', icon: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z' },
  { id: 'music', label: 'Music', icon: 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z' },
  { id: 'voice-script', label: 'Voice & Script', icon: 'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z' },
  { id: 'layers', label: 'Layers', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'ai-input', label: 'AI Input Settings', icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75' },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export function EditorModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('slideshow')
  const [showStockDropdown, setShowStockDropdown] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [voiceUpdating, setVoiceUpdating] = useState(false)
  const { state, dispatch, updateBottomBanner, updateEndScreen, updateQrCode, updateMusic, updateVoice } = useStudioState()
  const playbackRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputSlideRef = useRef<HTMLInputElement>(null)
  const [changingSlideIndex, setChangingSlideIndex] = useState<number | null>(null)

  const totalDuration = Math.max(1, state.slides.reduce((sum, s) => sum + (s.endTime - s.startTime), 0))

  useEffect(() => {
    if (state.qrCode.enabled && state.bottomBanner.websiteUrl) {
      setQrDataUrl(generateQRDataUrl(state.bottomBanner.websiteUrl, 200))
    } else {
      setQrDataUrl('')
    }
  }, [state.qrCode.enabled, state.bottomBanner.websiteUrl])

  useEffect(() => {
    if (state.music.enabled && state.isPlaying) {
      audioGen.playGenre(state.music.genre)
    } else {
      audioGen.stop()
    }
    return () => { audioGen.stop() }
  }, [state.music.enabled, state.music.genre, state.isPlaying])

  useEffect(() => {
    if (state.isPlaying) {
      playbackRef.current = setInterval(() => {
        const next = state.currentTime + 0.1
        if (next >= totalDuration) {
          dispatch({ type: 'SET_IS_PLAYING', payload: false })
          dispatch({ type: 'SET_CURRENT_TIME', payload: 0 })
          audioGen.stop()
        } else {
          dispatch({ type: 'SET_CURRENT_TIME', payload: next })
        }
      }, 100)
    } else {
      if (playbackRef.current) {
        clearInterval(playbackRef.current)
        playbackRef.current = null
      }
    }
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current)
    }
  }, [state.isPlaying, state.currentTime, totalDuration, dispatch])

  const togglePlayback = useCallback(() => {
    if (state.currentTime >= totalDuration) {
      dispatch({ type: 'SET_CURRENT_TIME', payload: 0 })
    }
    dispatch({ type: 'SET_IS_PLAYING', payload: !state.isPlaying })
  }, [state.currentTime, totalDuration, dispatch])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlayback()
          break
        case 'ArrowLeft':
          e.preventDefault()
          dispatch({ type: 'SET_CURRENT_TIME', payload: Math.max(0, state.currentTime - 2) })
          break
        case 'ArrowRight':
          e.preventDefault()
          dispatch({ type: 'SET_CURRENT_TIME', payload: Math.min(totalDuration, state.currentTime + 2) })
          break
        case 'ArrowUp': {
          e.preventDefault()
          const prevIdx = state.slides.findIndex(s => state.currentTime >= s.startTime && state.currentTime < s.endTime)
          if (prevIdx > 0) {
            const slide = state.slides[prevIdx - 1]
            dispatch({ type: 'SET_CURRENT_TIME', payload: slide.startTime })
          }
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          const nextIdx = state.slides.findIndex(s => state.currentTime >= s.startTime && state.currentTime < s.endTime)
          if (nextIdx >= 0 && nextIdx < state.slides.length - 1) {
            const slide = state.slides[nextIdx + 1]
            dispatch({ type: 'SET_CURRENT_TIME', payload: slide.startTime })
          }
          break
        }
        case 'KeyE':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            setShowExport(true)
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.currentTime, state.slides, totalDuration, dispatch, togglePlayback])

  const handleSeek = useCallback((time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time })
  }, [dispatch])

  const currentSlideIndex = state.slides.findIndex(
    (s) => state.currentTime >= s.startTime && state.currentTime < s.endTime
  )
  const activeSlide = currentSlideIndex >= 0 ? state.slides[currentSlideIndex] : state.slides[0]

  const handleSlideChange = (index: number, file: File) => {
    const url = URL.createObjectURL(file)
    const newSlides = state.slides.map((s, i) =>
      i === index ? { ...s, imageUrl: url } : s
    )
    dispatch({ type: 'SET_SLIDES', payload: newSlides })
  }

  const handleTrimSlide = useCallback((slideId: string, newStart: number, newEnd: number) => {
    const newSlides = state.slides.map(s =>
      s.id === slideId ? { ...s, startTime: newStart, endTime: newEnd } : s
    )
    const sorted = newSlides.sort((a, b) => a.startTime - b.startTime)
    dispatch({ type: 'SET_SLIDES', payload: sorted })
  }, [state.slides, dispatch])

  const handleReorderSlides = (fromIndex: number, toIndex: number) => {
    const newSlides = [...state.slides]
    const [moved] = newSlides.splice(fromIndex, 1)
    newSlides.splice(toIndex, 0, moved)
    let time = 0
    const reindexed = newSlides.map((s) => {
      const dur = s.endTime - s.startTime
      const slide = { ...s, startTime: time, endTime: time + dur }
      time += dur
      return slide
    })
    dispatch({ type: 'SET_SLIDES', payload: reindexed })
  }

  const moveSlideUp = (index: number) => {
    if (index <= 0) return
    handleReorderSlides(index, index - 1)
  }

  const moveSlideDown = (index: number) => {
    if (index >= state.slides.length - 1) return
    handleReorderSlides(index, index + 1)
  }

  const handleChangeSlideImage = (idx: number) => {
    setChangingSlideIndex(idx)
    fileInputSlideRef.current?.click()
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#111118] flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-white font-semibold text-sm">AdStudio</span>
          <span className="text-[10px] text-white/30 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">Beta</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-20 shrink-0 bg-[#0d0d14] border-r border-white/5 flex flex-col items-center py-4 gap-1 overflow-y-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-16 py-3 rounded-xl flex flex-col items-center gap-1.5 text-[10px] transition-all ${
                  isActive
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                <span className="leading-tight text-center">{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="w-[340px] shrink-0 overflow-y-auto border-r border-white/5 p-5">
          {activeTab === 'slideshow' && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold text-lg">Slideshow</h2>
              <p className="text-xs text-white/40 -mt-2">Drag trim handles on timeline to adjust duration.</p>
              <div className="space-y-3">
                {state.slides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className={`rounded-xl overflow-hidden border ${
                      idx === currentSlideIndex || (!activeSlide && idx === 0)
                        ? 'border-accent ring-1 ring-accent/30'
                        : 'border-white/10'
                    } bg-[#1a1a25] transition-all`}
                  >
                    <div className="relative aspect-video bg-[#0d0d14] group">
                      <img
                        src={slide.imageUrl}
                        alt={slide.label}
                        className="w-full h-full object-cover"
                      />
                      <input
                        ref={fileInputSlideRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f && changingSlideIndex !== null) {
                            handleSlideChange(changingSlideIndex, f)
                            setChangingSlideIndex(null)
                          }
                        }}
                      />
                      <button
                        onClick={() => handleChangeSlideImage(idx)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-accent/80"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {(idx === currentSlideIndex || (!activeSlide && idx === 0)) && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-accent text-white text-[10px] font-medium shadow-sm">
                          Now playing
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1 right-1 flex justify-between text-[9px] text-white/60 px-1">
                        <span>{(slide.endTime - slide.startTime).toFixed(1)}s</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <div>
                        <div className="text-white text-xs font-medium">{slide.label}</div>
                        <div className="text-white/40 text-[10px] font-mono">
                          {slide.startTime.toFixed(1)}s → {slide.endTime.toFixed(1)}s
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSlideUp(idx)}
                          disabled={idx === 0}
                          className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center disabled:opacity-30 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveSlideDown(idx)}
                          disabled={idx === state.slides.length - 1}
                          className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center disabled:opacity-30 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <span className="text-white/20 cursor-grab text-lg leading-none ml-1">⠿</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-white/40 mt-4">
                Need more images or videos? Here is our recommended list of stock image libraries.
              </p>

              <div className="relative">
                <button
                  onClick={() => setShowStockDropdown(!showStockDropdown)}
                  className="w-full px-4 py-2.5 rounded-lg border border-accent/50 text-accent text-sm font-medium hover:bg-accent/10 transition-colors"
                >
                  Discover stock assets
                </button>
                {showStockDropdown && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#1a1a25] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10">
                    <div className="px-4 py-2 text-[10px] text-white/30 uppercase tracking-widest">Free</div>
                    {FREE_STOCK_SITES.map((site) => (
                      <a key={site.name} href={site.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 text-sm text-white/70 transition-colors"
                      >
                        {site.name}
                        <svg className="w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                    <div className="border-t border-white/5 px-4 py-2 text-[10px] text-white/30 uppercase tracking-widest">Paying</div>
                    {PAID_STOCK_SITES.map((site) => (
                      <a key={site.name} href={site.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 text-sm text-white/70 transition-colors"
                      >
                        {site.name}
                        <svg className="w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bottom-banner' && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg">Bottom banner</h2>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/60">Logo</label>
                  <button className="px-3 py-1 rounded-lg border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors">
                    Upload logo
                  </button>
                </div>
                {state.logoUrl ? (
                  <div className="w-16 h-16 rounded-lg bg-[#1a1a25] border border-white/10 flex items-center justify-center overflow-hidden">
                    <img src={state.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-[#1a1a25] border border-dashed border-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <InputField label="Company name" value={state.bottomBanner.companyName}
                onChange={(v) => updateBottomBanner({ companyName: v })} />
              <div>
                <InputField label="Address" value={state.bottomBanner.address}
                  onChange={(v) => updateBottomBanner({ address: v })} />
                {!state.bottomBanner.address && <MissingInfo />}
              </div>
              <div>
                <InputField label="Phone Number" value={state.bottomBanner.phone}
                  onChange={(v) => updateBottomBanner({ phone: v })} />
                {!state.bottomBanner.phone && <MissingInfo />}
              </div>
              <InputField label="Website URL" value={state.bottomBanner.websiteUrl}
                onChange={(v) => updateBottomBanner({ websiteUrl: v })} />
            </div>
          )}

          {activeTab === 'end-screen' && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg">End screen</h2>
              <InputField label="Company name" value={state.endScreen.companyName}
                onChange={(v) => updateEndScreen({ companyName: v })} />
              <div>
                <InputField label="Address" value={state.endScreen.address}
                  onChange={(v) => updateEndScreen({ address: v })} />
                {!state.endScreen.address && <MissingInfo />}
              </div>
              <div>
                <InputField label="Phone Number" value={state.endScreen.phone}
                  onChange={(v) => updateEndScreen({ phone: v })} />
                {!state.endScreen.phone && <MissingInfo />}
              </div>
              <InputField label="Website URL" value={state.endScreen.websiteUrl}
                onChange={(v) => updateEndScreen({ websiteUrl: v })} />
              <div>
                <label className="text-xs text-white/60 block mb-2">Accent color</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-10 h-10 rounded-lg border border-white/10 transition-transform hover:scale-105"
                      style={{ backgroundColor: state.endScreen.accentColor }}
                    />
                    {showColorPicker && (
                      <div className="absolute top-full mt-2 left-0 z-10 bg-[#1a1a25] border border-white/10 rounded-xl p-3 shadow-2xl">
                        <input
                          type="color"
                          value={state.endScreen.accentColor}
                          onChange={(e) => updateEndScreen({ accentColor: e.target.value })}
                          className="w-40 h-32 rounded cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={state.endScreen.accentColor}
                    onChange={(e) => updateEndScreen({ accentColor: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#1a1a25] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50 font-mono"
                  />
                </div>
                <p className="text-[10px] text-white/40 mt-1.5">This color will appear on the video end card.</p>
              </div>
            </div>
          )}

          {activeTab === 'qr-code' && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg">QR code</h2>
              <ToggleOption label="Show QR code" enabled={state.qrCode.enabled}
                onChange={(v) => updateQrCode({ enabled: v })} />
              {state.qrCode.enabled && (
                <div className="text-center">
                  <div className="w-40 h-40 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-white/10 overflow-hidden">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code" className="w-36 h-36" />
                    ) : (
                      <div className="text-xs text-black/40">No URL set</div>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40 mt-2">
                    QR points to: {state.bottomBanner.websiteUrl || 'No website URL'}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'music' && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg">Music</h2>
              <ToggleOption label="Enable music" enabled={state.music.enabled}
                onChange={(v) => {
                  updateMusic({ enabled: v })
                  if (!v) audioGen.stop()
                }} />
              {state.music.enabled && (
                <>
                  <div>
                    <label className="text-xs text-white/60 block mb-2">Music genre</label>
                    <select
                      value={state.music.genre}
                      onChange={(e) => updateMusic({ genre: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#1a1a25] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
                    >
                      {MUSIC_GENRES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-white/60 block mb-2">Upload custom audio</label>
                    <label className="flex items-center gap-2 px-3 py-2.5 bg-[#1a1a25] border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-accent/50 transition-colors">
                      <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs text-white/50">{state.music.audioFile?.name || 'MP3, WAV, or OGG'}</span>
                      <input type="file" accept="audio/*" className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          const dataUrl = await readFileAsDataURL(f)
                          const waveform = await generateWaveform(f)
                          dispatch({ type: 'SET_MUSIC_AUDIO_FILE', payload: { dataUrl, name: f.name, waveform } })
                        }}
                      />
                    </label>
                    {state.music.audioFile && (
                      <div className="mt-2">
                        <WaveformViewer waveform={state.music.audioFile.waveform} color="#22c55e" height={36} />
                      </div>
                    )}
                  </div>

                  <div className="bg-[#1a1a25] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/60">Preview</span>
                      <button
                        onClick={() => {
                          if (audioGen.getIsPlaying()) {
                            audioGen.stop()
                          } else {
                            audioGen.playGenre(state.music.genre)
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-accent/20 hover:bg-accent/30 flex items-center justify-center transition-colors"
                      >
                        {audioGen.getIsPlaying() ? (
                          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex items-end gap-1 h-12">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t"
                          style={{
                            height: `${Math.abs(Math.sin(i * 0.4 + state.music.genre.length)) * 32 + 8}px`,
                            backgroundColor: audioGen.getIsPlaying() ? '#22c55e' : '#ffffff15',
                            opacity: audioGen.getIsPlaying() ? 0.6 + Math.sin(i * 0.3) * 0.3 : 0.3,
                            transition: 'all 0.3s',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40">
                    Music plays automatically during video playback. Genre changes apply on next play.
                  </p>
                </>
              )}
            </div>
          )}

          {activeTab === 'voice-script' && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg">Voice & Script</h2>
              <ToggleOption label="Enable voice" enabled={state.voice.enabled}
                onChange={(v) => updateVoice({ enabled: v })} />
              {state.voice.enabled && (
                <>
                  <div>
                    <label className="text-xs text-white/60 block mb-2">Script</label>
                    <textarea
                      value={state.voice.script}
                      onChange={(e) => updateVoice({ script: e.target.value })}
                      rows={8}
                      className="w-full px-3 py-2.5 bg-[#1a1a25] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50 resize-none font-mono leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 block mb-2">Upload voiceover audio</label>
                    <label className="flex items-center gap-2 px-3 py-2.5 bg-[#1a1a25] border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-accent/50 transition-colors">
                      <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span className="text-xs text-white/50">{state.voice.audioFile?.name || 'Upload voiceover (MP3, WAV)'}</span>
                      <input type="file" accept="audio/*" className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          const dataUrl = await readFileAsDataURL(f)
                          const waveform = await generateWaveform(f)
                          dispatch({ type: 'SET_VOICE_AUDIO_FILE', payload: { dataUrl, name: f.name, waveform } })
                        }}
                      />
                    </label>
                    {state.voice.audioFile && (
                      <div className="mt-2">
                        <WaveformViewer waveform={state.voice.audioFile.waveform} color="#a855f7" height={36} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-white/60 block mb-2">Voice selected</label>
                    <select
                      value={state.voice.voiceProfile}
                      onChange={(e) => updateVoice({ voiceProfile: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#1a1a25] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
                    >
                      {VOICE_PROFILES_EXTENDED.map((vp) => (
                        <option key={vp} value={vp}>{vp}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setVoiceUpdating(true)
                      setTimeout(() => {
                        setVoiceUpdating(false)
                      }, 2000)
                    }}
                    disabled={voiceUpdating}
                    className="w-full py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {voiceUpdating ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Updating...
                      </span>
                    ) : 'Update voice'}
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'layers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg">Layers</h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const id = generateId()
                      dispatch({ type: 'ADD_LAYER', payload: { id, type: 'text', content: 'New Text', x: 50, y: 50, width: 200, height: 40, opacity: 1, rotation: 0, fontSize: 32, color: '#ffffff' } })
                      dispatch({ type: 'SET_SELECTED_LAYER_ID', payload: id })
                    }}
                    className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30 transition-colors"
                  >
                    + Text
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = async () => {
                        const f = input.files?.[0]
                        if (!f) return
                        const dataUrl = await readFileAsDataURL(f)
                        const id = generateId()
                        dispatch({ type: 'ADD_LAYER', payload: { id, type: 'image', content: dataUrl, x: 100, y: 100, width: 150, height: 150, opacity: 1, rotation: 0 } })
                        dispatch({ type: 'SET_SELECTED_LAYER_ID', payload: id })
                      }
                      input.click()
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors"
                  >
                    + Image
                  </button>
                </div>
              </div>

              {state.layers.length === 0 ? (
                <div className="text-center py-12 text-white/30 text-sm">
                  No layers yet. Add text or image overlays.
                </div>
              ) : (
                <div className="space-y-2">
                  {state.layers.map((layer) => (
                    <div
                      key={layer.id}
                      className={`rounded-xl border p-3 transition-all cursor-pointer ${
                        state.selectedLayerId === layer.id
                          ? 'border-accent/50 bg-accent/5'
                          : 'border-white/10 bg-[#1a1a25] hover:border-white/20'
                      }`}
                      onClick={() => dispatch({ type: 'SET_SELECTED_LAYER_ID', payload: layer.id })}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${layer.type === 'text' ? 'bg-accent' : 'bg-purple-400'}`} />
                          <span className="text-white text-xs font-medium capitalize">{layer.type}</span>
                          <span className="text-white/40 text-[10px] truncate max-w-[100px]">{layer.type === 'text' ? layer.content : 'Image'}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_LAYER', payload: layer.id }) }}
                          className="w-5 h-5 rounded hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {state.selectedLayerId === layer.id && (
                        <div className="space-y-3 pt-2 border-t border-white/5">
                          {layer.type === 'text' && (
                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Content</label>
                              <input type="text" value={layer.content}
                                onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { content: e.target.value } } })}
                                className="w-full px-2 py-1.5 bg-[#0d0d14] border border-white/10 rounded text-white text-xs focus:outline-none focus:border-accent/50"
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">X</label>
                              <input type="number" value={layer.x}
                                onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { x: parseInt(e.target.value) || 0 } } })}
                                className="w-full px-2 py-1.5 bg-[#0d0d14] border border-white/10 rounded text-white text-xs focus:outline-none focus:border-accent/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Y</label>
                              <input type="number" value={layer.y}
                                onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { y: parseInt(e.target.value) || 0 } } })}
                                className="w-full px-2 py-1.5 bg-[#0d0d14] border border-white/10 rounded text-white text-xs focus:outline-none focus:border-accent/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Width</label>
                              <input type="number" value={layer.width}
                                onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { width: parseInt(e.target.value) || 0 } } })}
                                className="w-full px-2 py-1.5 bg-[#0d0d14] border border-white/10 rounded text-white text-xs focus:outline-none focus:border-accent/50"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-white/50 block mb-1">Height</label>
                              <input type="number" value={layer.height}
                                onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { height: parseInt(e.target.value) || 0 } } })}
                                className="w-full px-2 py-1.5 bg-[#0d0d14] border border-white/10 rounded text-white text-xs focus:outline-none focus:border-accent/50"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-white/50 block mb-1">Opacity ({Math.round(layer.opacity * 100)}%)</label>
                            <input type="range" min="0" max="1" step="0.05" value={layer.opacity}
                              onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { opacity: parseFloat(e.target.value) } } })}
                              className="w-full h-1 accent-accent cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/50 block mb-1">Rotation ({layer.rotation}°)</label>
                            <input type="range" min="-180" max="180" step="1" value={layer.rotation}
                              onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { rotation: parseInt(e.target.value) || 0 } } })}
                              className="w-full h-1 accent-accent cursor-pointer"
                            />
                          </div>
                          {layer.type === 'text' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-white/50 block mb-1">Font size</label>
                                <input type="number" value={layer.fontSize || 32}
                                  onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { fontSize: parseInt(e.target.value) || 16 } } })}
                                  className="w-full px-2 py-1.5 bg-[#0d0d14] border border-white/10 rounded text-white text-xs focus:outline-none focus:border-accent/50"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-white/50 block mb-1">Color</label>
                                <input type="color" value={layer.color || '#ffffff'}
                                  onChange={(e) => dispatch({ type: 'UPDATE_LAYER', payload: { id: layer.id, changes: { color: e.target.value } } })}
                                  className="w-full h-8 rounded cursor-pointer bg-transparent"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai-input' && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold text-lg">AI Input Settings</h2>
              <p className="text-xs text-white/40">Select the input source you want the AI to use to generate your creative.</p>

              <div className="space-y-2">
                <button
                  onClick={() => dispatch({ type: 'SET_AI_INPUT', payload: { sourceType: 'url' } })}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    state.aiInput.sourceType === 'url'
                      ? 'bg-accent/10 border-accent/50'
                      : 'bg-[#1a1a25] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      state.aiInput.sourceType === 'url' ? 'border-accent' : 'border-white/30'
                    }`}>
                      {state.aiInput.sourceType === 'url' && <div className="w-2 h-2 rounded-full bg-accent" />}
                    </div>
                    <span className="text-white text-sm font-medium">Any website URL</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 ml-6">Generate from a website URL</p>
                </button>

                <button
                  onClick={() => dispatch({ type: 'SET_AI_INPUT', payload: { sourceType: 'maps' } })}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    state.aiInput.sourceType === 'maps'
                      ? 'bg-accent/10 border-accent/50'
                      : 'bg-[#1a1a25] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      state.aiInput.sourceType === 'maps' ? 'border-accent' : 'border-white/30'
                    }`}>
                      {state.aiInput.sourceType === 'maps' && <div className="w-2 h-2 rounded-full bg-accent" />}
                    </div>
                    <span className="text-white text-sm font-medium">Business place</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 ml-6">Generate from a business on Google Maps</p>
                </button>
              </div>

              <input
                type="text"
                placeholder="Enter your url or your business name (Google Maps)"
                value={state.aiInput.query}
                onChange={(e) => dispatch({ type: 'SET_AI_INPUT', payload: { query: e.target.value } })}
                className="w-full px-3 py-2.5 bg-[#1a1a25] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50 placeholder:text-white/30"
              />

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg border border-accent/50 text-accent font-medium text-sm hover:bg-accent/10 transition-all"
              >
                Generate a creative
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col p-5 gap-4 min-w-0">
          <LivePreview activeSlide={activeSlide} totalDuration={totalDuration} />

          <TimelineBar
            slides={state.slides}
            currentTime={state.currentTime}
            totalDuration={totalDuration}
            isPlaying={state.isPlaying}
            musicEnabled={state.music.enabled}
            voiceEnabled={state.voice.enabled}
            qrEnabled={state.qrCode.enabled}
            zoom={state.zoom}
            onTogglePlay={togglePlayback}
            onSeek={handleSeek}
            onTrimSlide={handleTrimSlide}
            onZoomChange={(z) => dispatch({ type: 'SET_ZOOM', payload: z })}
          />

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2 text-[10px] text-white/30">
              <span>{state.slides.length} slides</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>{(totalDuration).toFixed(0)}s total</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>{state.music.enabled ? 'Music: ON' : 'Music: OFF'}</span>
            </div>
            <button
              onClick={() => setShowExport(true)}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-accent to-purple-600 text-white font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-accent/25"
            >
              Save and continue
            </button>
          </div>
        </div>
      </div>

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-white/60 block mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-[#1a1a25] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50 placeholder:text-white/30"
      />
    </div>
  )
}

function MissingInfo() {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      <span className="text-[10px] text-red-400">Information missing.</span>
    </div>
  )
}

function ToggleOption({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-11 h-6 rounded-full transition-all relative ${
          enabled ? 'bg-accent' : 'bg-white/10'
        }`}
      >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${
          enabled ? 'left-6' : 'left-1'
        }`} />
      </button>
    </div>
  )
}
