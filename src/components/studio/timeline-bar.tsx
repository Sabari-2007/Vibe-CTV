'use client'

import { useRef, useState, useCallback } from 'react'
import type { Slide } from '@/lib/ad-studio-types'

interface TimelineBarProps {
  slides: Slide[]
  currentTime: number
  totalDuration: number
  isPlaying: boolean
  musicEnabled: boolean
  voiceEnabled: boolean
  qrEnabled: boolean
  zoom: number
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onTrimSlide?: (slideId: string, newStart: number, newEnd: number) => void
  onZoomChange?: (zoom: number) => void
}

export function TimelineBar({
  slides,
  currentTime,
  totalDuration,
  isPlaying,
  musicEnabled,
  voiceEnabled,
  qrEnabled,
  zoom,
  onTogglePlay,
  onSeek,
  onTrimSlide,
  onZoomChange,
}: TimelineBarProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [trimming, setTrimming] = useState<{ slideId: string; edge: 'start' | 'end' } | null>(null)

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current || trimming) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = Math.max(0, Math.min(totalDuration, (x / rect.width) * totalDuration))
    onSeek(time)
  }, [totalDuration, onSeek, trimming])

  const handleTrimStart = useCallback((e: React.MouseEvent, slideId: string, edge: 'start' | 'end') => {
    e.stopPropagation()
    setTrimming({ slideId, edge })
  }, [])

  const handleTrimMove = useCallback((e: React.MouseEvent) => {
    if (!trimming || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = Math.max(0, Math.min(totalDuration, (x / rect.width) * totalDuration))
    const slide = slides.find(s => s.id === trimming.slideId)
    if (!slide || !onTrimSlide) return
    const minDuration = 1
    if (trimming.edge === 'start') {
      const newStart = Math.min(time, slide.endTime - minDuration)
      onTrimSlide(slide.id, newStart, slide.endTime)
    } else {
      const newEnd = Math.max(time, slide.startTime + minDuration)
      onTrimSlide(slide.id, slide.startTime, newEnd)
    }
  }, [trimming, totalDuration, slides, onTrimSlide])

  const handleTrimEnd = useCallback(() => {
    setTrimming(null)
  }, [])

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatTimePrecise = (t: number) => `${t.toFixed(1)}s`

  const playheadPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  const activeSlide = slides.find(s => currentTime >= s.startTime && currentTime < s.endTime)

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
        >
          {isPlaying ? (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          )}
        </button>
        <span className="text-xs text-white/60 font-mono w-12 tabular-nums">{formatTime(currentTime)}</span>
        <span className="text-xs text-white/30 font-mono">/ {formatTime(totalDuration)}</span>

        <div className="flex-1 flex items-center">
          <div
            ref={timelineRef}
            className="flex-1 h-20 bg-[#1a1a25] rounded-lg border border-white/5 relative overflow-hidden cursor-pointer"
            onClick={handleTimelineClick}
            onMouseDown={() => !trimming && setDragging(true)}
            onMouseUp={() => { setDragging(false); handleTrimEnd() }}
            onMouseLeave={() => { setDragging(false); handleTrimEnd() }}
            onMouseMove={(e) => {
              if (dragging && !trimming) handleTimelineClick(e)
              if (trimming) handleTrimMove(e)
            }}
          >
            {slides.map((slide) => {
              const left = (slide.startTime / totalDuration) * 100
              const width = ((slide.endTime - slide.startTime) / totalDuration) * 100
              const isActive = currentTime >= slide.startTime && currentTime < slide.endTime
              const isTrimmingThis = trimming?.slideId === slide.id
              return (
                <div
                  key={slide.id}
                  className={`absolute top-0.5 bottom-0.5 rounded-md overflow-hidden border transition-all group ${
                    isActive ? 'border-accent z-10' : 'border-white/5 hover:border-white/20'
                  } ${isTrimmingThis ? 'z-20 ring-2 ring-accent/50' : ''}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-0.5 left-1 right-1 flex justify-between">
                    <span className="text-[8px] text-white/80 font-medium truncate">{slide.label}</span>
                    <span className="text-[7px] text-white/60 font-mono">
                      {(slide.endTime - slide.startTime).toFixed(0)}s
                    </span>
                  </div>
                  {isTrimmingThis && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-accent text-white text-[8px] font-mono whitespace-nowrap shadow-lg">
                      {formatTimePrecise(slide.endTime - slide.startTime)}
                    </div>
                  )}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 bg-white/40 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-accent hover:w-2.5 transition-all"
                    onMouseDown={(e) => handleTrimStart(e, slide.id, 'start')}
                    title="Drag to trim start"
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-accent hover:w-2.5 transition-all"
                    onMouseDown={(e) => handleTrimStart(e, slide.id, 'end')}
                    title="Drag to trim end"
                  />
                  {isTrimmingThis && trimming?.edge === 'start' && (
                    <div className="absolute left-0 top-0 w-1 bg-accent h-full shadow-sm shadow-accent/50" />
                  )}
                  {isTrimmingThis && trimming?.edge === 'end' && (
                    <div className="absolute right-0 top-0 w-1 bg-accent h-full shadow-sm shadow-accent/50" />
                  )}
                </div>
              )
            })}

            <div className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-lg shadow-accent/50 z-20 transition-all duration-100 pointer-events-none"
              style={{ left: `${playheadPercent}%` }}
            >
              <div className="w-3 h-3 rounded-full bg-accent -ml-[5px] -mt-1 shadow-lg shadow-accent/50" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <ZoomControl zoom={zoom} onZoomChange={onZoomChange} />
        </div>
      </div>

      <div className="flex items-center text-[10px] text-white/30 font-mono pl-[4.5rem] h-4">
        {slides.length > 0 && (
          <>
            <span className="w-10 text-left">{formatTime(0)}</span>
            {slides.map((s) => (
              <span key={s.id} className="flex-1 text-center">{formatTime(s.endTime)}</span>
            ))}
          </>
        )}
      </div>

      <div className="space-y-1 pl-[4.5rem]">
        <TrackRow label="Bottom banner" color="#ec4899" active={true} waveform={true} />
        <TrackRow label="QR code" color="#14b8a6" active={qrEnabled} waveform={false} />
        <TrackRow label="Music" color="#22c55e" active={musicEnabled} waveform={true} />
        <TrackRow label="Voice & Script" color="#a855f7" active={voiceEnabled} waveform={true} />
      </div>

      {activeSlide && (
        <div className="flex items-center gap-2 pl-[4.5rem] text-[10px] text-white/40">
          <span>Current: {activeSlide.label}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>{formatTime(activeSlide.startTime)} - {formatTime(activeSlide.endTime)}</span>
        </div>
      )}
    </div>
  )
}

function TrackRow({ label, color, active, waveform }: { label: string; color: string; active: boolean; waveform: boolean }) {
  return (
    <div className="flex items-center gap-2 group">
      <span className="text-[9px] text-white/40 w-20 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-4 rounded bg-[#1a1a25] relative overflow-hidden border border-white/5">
        {active && (
          <div className="absolute inset-0 flex items-center opacity-20" style={{ backgroundColor: color }}>
            {waveform && (
              <div className="flex items-center gap-px w-full px-1">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${Math.sin(i * 0.5) * 6 + 8}px`,
                      backgroundColor: color,
                      opacity: 0.5 + Math.sin(i * 0.3) * 0.3,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white/20">
            Disabled
          </div>
        )}
      </div>
      <div className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
        style={{ backgroundColor: active ? color : '#ffffff20' }}
      />
    </div>
  )
}

function ZoomControl({ zoom, onZoomChange }: { zoom: number; onZoomChange?: (z: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
      <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="range"
        min="0.25"
        max="3"
        step="0.25"
        value={zoom}
        onChange={(e) => onZoomChange?.(parseFloat(e.target.value))}
        className="w-16 h-1 accent-accent cursor-pointer"
      />
      <span className="w-6 text-right text-[9px] text-white/50 font-mono">{zoom.toFixed(2)}x</span>
    </div>
  )
}
