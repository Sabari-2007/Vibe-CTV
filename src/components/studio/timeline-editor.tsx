'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { TimelineTrack, TimelineClip } from '@/lib/studio-types'
import { Button } from '@/components/ui/button'

interface TimelineEditorProps {
  tracks: TimelineTrack[]
  currentTime: number
  playing: boolean
  onSeek: (time: number) => void
  onSplitClip?: (trackId: string, clipId: string, time: number) => void
}

const TRACK_COLORS: Record<string, string> = {
  text: '#2563EB',
  video: '#7C3AED',
  voiceover: '#F59E0B',
  music: '#EF4444',
}

const DURATION = 30
const PIXELS_PER_SECOND = 20

function ClipBlock({
  clip,
  color,
  trackId,
  onSplit,
}: {
  clip: TimelineClip
  color: string
  trackId: string
  onSplit?: (trackId: string, clipId: string, time: number) => void
}) {
  const left = clip.startTime * PIXELS_PER_SECOND
  const width = clip.duration * PIXELS_PER_SECOND

  return (
    <motion.div
      className="absolute top-1 bottom-1 rounded-md flex items-center px-2 cursor-pointer group"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: `${color}20`,
        borderLeft: `2px solid ${color}`,
      }}
      whileHover={{ scale: 1.02 }}
      drag="x"
      dragMomentum={false}
      dragConstraints={{ left: 0, right: 600 }}
      onDragEnd={(_, info) => {
        const newStart = Math.max(0, clip.startTime + info.offset.x / PIXELS_PER_SECOND)
        if (onSplit && info.offset.x > 10) {
          onSplit(trackId, clip.id, newStart)
        }
      }}
    >
      <span className="text-[10px] text-ink-light/70 truncate font-mono">{clip.content}</span>
    </motion.div>
  )
}

export function TimelineEditor({
  tracks,
  currentTime,
  playing,
  onSeek,
  onSplitClip,
}: TimelineEditorProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = Math.max(0, Math.min(DURATION, x / PIXELS_PER_SECOND))
    onSeek(time)
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-ink-light uppercase tracking-wider">Timeline</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ink-light/60 font-mono">
            {currentTime.toFixed(1)}s / {DURATION}s
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {tracks.length === 0 ? (
          <div className="text-center py-8 text-xs text-ink-light">
            No tracks yet. Generate from URL or add assets manually.
          </div>
        ) : (
          tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-2">
              <div className="w-20 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: TRACK_COLORS[track.type] || '#94A3B8' }}
                  />
                  <span className="text-[10px] text-ink-light font-medium truncate">{track.name}</span>
                </div>
              </div>

              <div
                ref={timelineRef}
                className="relative flex-1 h-8 rounded-md bg-muted/30 cursor-pointer overflow-hidden"
                onClick={handleTimelineClick}
                onMouseDown={() => setDragging(true)}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
                onMouseMove={(e) => {
                  if (dragging) handleTimelineClick(e)
                }}
              >
                {track.clips.map((clip) => (
                  <ClipBlock
                    key={clip.id}
                    clip={clip}
                    color={TRACK_COLORS[track.type] || '#94A3B8'}
                    trackId={track.id}
                    onSplit={onSplitClip}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="relative h-6 mt-2">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-muted" />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-lg shadow-accent/50 transition-all duration-100"
          style={{ left: `${currentTime * PIXELS_PER_SECOND}px` }}
        >
          <div className="w-2 h-2 rounded-full bg-accent -ml-[3px] -mt-[3px]" />
        </div>
        {Array.from({ length: DURATION + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 text-[8px] text-ink-light/40 font-mono"
            style={{ left: `${i * PIXELS_PER_SECOND}px`, transform: 'translateX(-50%)' }}
          >
            {i % 5 === 0 ? `${i}s` : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
