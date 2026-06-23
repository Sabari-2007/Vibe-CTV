'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ScrapeLog } from '@/lib/studio-types'
import { useStudioState } from '@/lib/state-context'
import { EditorModal } from '@/components/studio/editor-modal'

export function LandingHero() {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [logs, setLogs] = useState<ScrapeLog[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [showGenerating, setShowGenerating] = useState(false)
  const { dispatch } = useStudioState()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleScrape = useCallback(async (url: string) => {
    setScraping(true)
    setLogs([])
    setShowGenerating(true)
    setShowDropdown(false)

    try {
      const res = await fetch('/api/studio/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error('Scraping failed')
      const { data, logs } = await res.json()
      setLogs(logs || [])

      dispatch({
        type: 'SET_BUSINESS_DATA',
        payload: {
          businessName: data.brandName,
          logoUrl: data.logoUrl,
          heroImages: data.heroImages,
          tagline: data.tagline,
          featureBullets: data.featureBullets,
          accentColor: data.accentColor,
          slides: data.slides,
          bottomBanner: data.bottomBanner,
          endScreen: data.endScreen,
          voice: {
            enabled: false,
            script: data.script,
            voiceProfile: 'Male, American, Deep, Middle-aged',
            audioFile: null,
          },
          isGenerating: false,
        },
      })

      setTimeout(() => {
        setShowGenerating(false)
        setShowEditor(true)
        setScraping(false)
      }, 500)
    } catch {
      setScraping(false)
      setShowGenerating(false)
    }
  }, [dispatch])

  useEffect(() => {
    if (query.trim().length > 2) {
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }, [query])

  return (
    <>
      <section className="relative min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />

        <div className="relative z-10 w-full max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            AI-Powered Ad Generator
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 tracking-tight">
            No Creative? No Problem.
            <br />
            <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">
              We've Got You Covered.
            </span>
          </h1>

          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
            Type your business name or URL, and we'll turn it into a TV ad—instantly.
          </p>

          <div className="relative max-w-xl mx-auto">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.trim().length > 2 && setShowDropdown(true)}
                placeholder="Enter business name or website URL..."
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 text-lg transition-all"
              />
            </div>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a25] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                <div className="px-4 py-2 text-[10px] text-white/30 uppercase tracking-widest font-semibold">
                  Via URL
                </div>
                <button
                  onClick={() => handleScrape(query)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-white/80 text-sm">
                    Generate a creative for <span className="font-semibold text-white">{query}</span>
                  </span>
                </button>

                <div className="border-t border-white/5 px-4 py-2 text-[10px] text-white/30 uppercase tracking-widest font-semibold">
                  Suggestion via Google Maps
                </div>
                <div className="px-4 py-3 text-white/40 text-xs text-center">
                  Search for a business location to auto-detect details
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/30">
            <span>No credit card required</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Free to start</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>30-second ads</span>
          </div>
        </div>
      </section>

      {showGenerating && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0f] flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Generating your ad...</h2>
          <p className="text-white/50 text-sm mb-8">Scraping brand assets and building your video</p>
          <div className="w-72 space-y-2">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs font-mono ${
                  i === logs.length - 1 ? 'text-accent' : 'text-white/40'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                <span>
                  [{log.step}/{log.total}] {log.message}
                </span>
              </div>
            ))}
            {scraping && (
              <div className="flex items-center gap-2 text-xs text-accent font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
                Processing...
              </div>
            )}
          </div>
        </div>
      )}

      {showEditor && (
        <EditorModal onClose={() => setShowEditor(false)} />
      )}
    </>
  )
}
