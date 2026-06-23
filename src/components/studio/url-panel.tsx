'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ScrapeLog } from '@/lib/studio-types'

interface UrlPanelProps {
  onScrape: (url: string) => Promise<void>
  scraping: boolean
  logs: ScrapeLog[]
  script: string | null
}

export function UrlPanel({ onScrape, scraping, logs, script }: UrlPanelProps) {
  const [url, setUrl] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      await onScrape(url.trim())
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-ink mb-1">AI Auto-Generate</h3>
        <p className="text-xs text-ink-light">Enter a brand URL to automatically generate a 30s ad video.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={scraping}
        />
        <Button type="submit" disabled={scraping || !url.trim()} className="w-full">
          {scraping ? 'Processing...' : 'Generate Video'}
        </Button>
      </form>

      {logs.length > 0 && (
        <div className="space-y-1.5">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs font-mono ${
                i === logs.length - 1 && scraping
                  ? 'text-accent'
                  : 'text-ink-light/60'
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
      )}

      {script && !scraping && (
        <div className="card p-3 space-y-2">
          <h4 className="text-xs font-medium text-accent uppercase tracking-wider">Generated Script</h4>
          <pre className="text-xs text-ink-light whitespace-pre-wrap font-sans leading-relaxed">{script}</pre>
        </div>
      )}
    </div>
  )
}
