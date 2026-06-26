'use client'

import { useState, useCallback } from 'react'
import { VideoEditor } from '@/components/studio/video-editor'
import type { ScrapeLog } from '@/lib/studio-types'

export default function StudioRoute() {
  const [stage, setStage] = useState<'landing' | 'editor'>('landing')
  const [query, setQuery] = useState('')
  const [scraping, setScraping] = useState(false)
  const [logs, setLogs] = useState<ScrapeLog[]>([])
  const [scrapedSlides, setScrapedSlides] = useState<{ id: string; imageUrl: string; label: string }[]>([])
  const [scrapedBrand, setScrapedBrand] = useState('')

  const handleScrape = useCallback(async () => {
    if (!query.trim()) return
    setScraping(true)
    setLogs([])

    try {
      const res = await fetch('/api/studio/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: query.trim() }),
      })
      if (!res.ok) throw new Error('Scraping failed')
      const { data, logs } = await res.json()
      setLogs(logs || [])
      setScrapedBrand(data.brandName || '')
      setScrapedSlides((data.slides || []).map((s: { id?: string; imageUrl: string; label?: string }, i: number) => ({
        id: s.id || `slide-${i}`,
        imageUrl: s.imageUrl,
        label: s.label || `Slide ${i + 1}`,
      })))
      setTimeout(() => {
        setScraping(false)
        setStage('editor')
      }, 300)
    } catch {
      setScraping(false)
    }
  }, [query])

  if (stage === 'landing') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#0a0a0f] flex flex-col items-center justify-center relative overflow-hidden px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4f8cff]/5 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-[#4f8cff]/5 rounded-full blur-[100px]" />

        <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] text-white/60 mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            AI-Powered Video Studio
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight mb-2 sm:mb-3 tracking-tight px-2 sm:px-0">
            Turn a Website Into
            <span className="bg-gradient-to-r from-[#4f8cff] to-purple-400 bg-clip-text text-transparent"> a Video Ad</span>
          </h1>

          <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 max-w-md mx-auto px-4 sm:px-0">
            Enter a URL to scrape images and auto-generate your video.
          </p>

          <div className="relative max-w-lg mx-auto px-2 sm:px-0">
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                  placeholder="https://example.com"
                  className="w-full pl-9 pr-4 sm:pr-28 py-2.5 bg-white/5 border border-white/10 rounded-lg sm:rounded-r-none text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#4f8cff]/50 focus:ring-2 focus:ring-[#4f8cff]/20 transition-all"
                />
              </div>
              <button
                onClick={handleScrape}
                disabled={scraping || !query.trim()}
                className="sm:absolute sm:right-1.5 sm:top-1/2 sm:-translate-y-1/2 px-4 py-2 sm:py-1.5 rounded-lg sm:rounded-md bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] text-white text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-40"
              >
                {scraping ? 'Scraping...' : 'Generate'}
              </button>
            </div>
          </div>

          {scraping && logs.length > 0 && (
            <div className="mt-6 w-64 mx-auto space-y-1.5">
              {logs.map((log, i) => (
                <div key={i} className={`flex items-center gap-2 text-[10px] font-mono ${i === logs.length - 1 ? 'text-[#4f8cff]' : 'text-white/40'}`}>
                  <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                  <span>[{log.step}/{log.total}] {log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return <VideoEditor initialSlides={scrapedSlides} initialBrand={scrapedBrand} sourceUrl={query} />
}
