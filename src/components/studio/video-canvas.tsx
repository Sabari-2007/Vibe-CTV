'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface VideoCanvasProps {
  script: string | null
  brandName: string
  playing: boolean
  currentTime: number
  onTimeUpdate?: (time: number) => void
}

const CHAPTER_COLORS = ['#2563EB', '#7C3AED', '#EF4444', '#F59E0B']

export function VideoCanvas({ script, brandName, playing, currentTime, onTimeUpdate }: VideoCanvasProps) {
  const [chapters, setChapters] = useState<{ label: string; text: string; start: number; end: number }[]>([])

  useEffect(() => {
    if (!script) {
      setChapters([])
      return
    }
    const lines = script.split('\n').filter((l) => l.trim())
    const parsed: { label: string; text: string; start: number; end: number }[] = []
    let currentLabel = ''
    let currentText: string[] = []

    for (const line of lines) {
      const headerMatch = line.match(/^\[([^\]]+)\]/)
      if (headerMatch) {
        if (currentLabel && currentText.length > 0) {
          const timeRange = currentLabel.match(/[\d.]+/g)
          const start = timeRange ? parseFloat(timeRange[0]) : 0
          const end = timeRange && timeRange[1] ? parseFloat(timeRange[1]) : start + 5
          parsed.push({ label: currentLabel.split(' - ')[0].replace(/[[\]]/g, ''), text: currentText.join(' '), start, end })
        }
        currentLabel = headerMatch[0]
        currentText = []
      } else if (line.trim()) {
        currentText.push(line.trim())
      }
    }
    if (currentLabel && currentText.length > 0) {
      const timeRange = currentLabel.match(/[\d.]+/g)
      const start = timeRange ? parseFloat(timeRange[0]) : 0
      const end = timeRange && timeRange[1] ? parseFloat(timeRange[1]) : start + 5
      parsed.push({ label: currentLabel.split(' - ')[0].replace(/[[\]]/g, ''), text: currentText.join(' '), start, end })
    }
    setChapters(parsed)
  }, [script])

  const activeChapter = chapters.find((c) => currentTime >= c.start && currentTime < c.end)
  const activeIndex = chapters.findIndex((c) => c === activeChapter)

  const progress = script ? (currentTime / 30) * 100 : 0

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-ink border border-muted group">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-3/4 h-3/4">
          <div className="absolute inset-0 rounded-full bg-accent/5 blur-[80px]" />
          <div className="absolute top-1/3 left-1/3 w-24 h-24 rounded-full bg-accent/10 blur-[50px]" />
          <div className="absolute bottom-1/3 right-1/3 w-32 h-32 rounded-full bg-accent/10 blur-[60px]" />
        </div>
      </div>

      {!script && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-ink-light text-sm">Enter a URL or upload assets to preview</p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeChapter && (
          <motion.div
            key={activeChapter.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          >
            <div
              className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{
                color: CHAPTER_COLORS[activeIndex % CHAPTER_COLORS.length],
                backgroundColor: `${CHAPTER_COLORS[activeIndex % CHAPTER_COLORS.length]}15`,
                borderColor: `${CHAPTER_COLORS[activeIndex % CHAPTER_COLORS.length]}30`,
                borderWidth: 1,
              }}
            >
              {activeChapter.label}
            </div>
            <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-2xl">
              {activeChapter.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {brandName && (
        <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-accent font-medium border border-white/10">
          {brandName}
        </div>
      )}

      <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-ink-light font-mono border border-white/10">
        {(currentTime).toFixed(1)}s / 30s
      </div>

      {script && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <motion.div
            className="h-full bg-accent"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      {playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-accent/20 backdrop-blur-xl border border-accent/30 flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-6">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-accent rounded-full"
                  animate={{ height: [6, 20, 8, 24, 6] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
