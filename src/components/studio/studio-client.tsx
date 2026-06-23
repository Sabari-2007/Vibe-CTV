'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { UrlPanel } from './url-panel'
import { ManualPanel } from './manual-panel'
import { VideoCanvas } from './video-canvas'
import { TimelineEditor } from './timeline-editor'
import { Button } from '@/components/ui/button'
import type { TimelineTrack, TimelineClip, ScrapeLog, VideoAsset } from '@/lib/studio-types'

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function buildDefaultTracks(script: string): TimelineTrack[] {
  const textClips: TimelineClip[] = []
  const lines = script.split('\n').filter((l) => l.trim())
  let currentLabel = ''
  let currentText: string[] = []
  let time = 0

  for (const line of lines) {
    const headerMatch = line.match(/^\[([^\]]+)\]/)
    if (headerMatch) {
      if (currentLabel && currentText.length > 0) {
        textClips.push({
          id: generateId(),
          startTime: time,
          duration: 4,
          content: currentText.join(' ').substring(0, 60),
          properties: {},
        })
        time += 4
      }
      currentLabel = headerMatch[0]
      currentText = []
    } else if (line.trim()) {
      currentText.push(line.trim())
    }
  }
  if (currentText.length > 0) {
    textClips.push({
      id: generateId(),
      startTime: time,
      duration: 4,
      content: currentText.join(' ').substring(0, 60),
      properties: {},
    })
  }

  return [
    {
      id: generateId(),
      type: 'text',
      name: 'Text / Titles',
      order: 0,
      clips: textClips,
    },
    {
      id: generateId(),
      type: 'video',
      name: 'Parallax Video Assets',
      order: 1,
      clips: [
        { id: generateId(), startTime: 0, duration: 30, content: 'Brand background', properties: {} },
      ],
    },
    {
      id: generateId(),
      type: 'voiceover',
      name: 'Voiceover Track',
      order: 2,
      clips: [
        { id: generateId(), startTime: 0, duration: 28, content: 'AI Voiceover', properties: {} },
      ],
    },
    {
      id: generateId(),
      type: 'music',
      name: 'Background Music',
      order: 3,
      clips: [
        { id: generateId(), startTime: 0, duration: 30, content: 'Soundtrack', properties: {} },
      ],
    },
  ]
}

export function StudioClient() {
  const [mode, setMode] = useState<'url' | 'manual'>('url')
  const [scraping, setScraping] = useState(false)
  const [logs, setLogs] = useState<ScrapeLog[]>([])
  const [script, setScript] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('')
  const [tracks, setTracks] = useState<TimelineTrack[]>([])
  const [assets, setAssets] = useState<VideoAsset[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [voiceProfile, setVoiceProfile] = useState<string | null>(null)
  const [audioTrack, setAudioTrack] = useState<string | null>(null)
  const playbackRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleScrape = useCallback(async (url: string) => {
    setScraping(true)
    setLogs([])
    setScript(null)
    setTracks([])

    try {
      const res = await fetch('/api/studio/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (res.ok) {
        const result = await res.json()
        setLogs(result.logs || [])
        setScript(result.data.script)
        setBrandName(result.data.brandName)
        setTracks(buildDefaultTracks(result.data.script))
      }
    } catch {
      // fallback for local dev
    } finally {
      setScraping(false)
    }
  }, [])

  const handleAddAsset = useCallback((_file: File) => {
    const asset: VideoAsset = {
      id: generateId(),
      type: 'image',
      url: URL.createObjectURL(_file),
      label: _file.name,
      order: assets.length,
    }
    setAssets((prev) => [...prev, asset])

    if (tracks.length === 0) {
      const textTrack: TimelineTrack = {
        id: generateId(),
        type: 'text',
        name: 'Text / Titles',
        order: 0,
        clips: [
          { id: generateId(), startTime: 0, duration: 5, content: 'Your Brand', properties: {} },
        ],
      }
      const videoTrack: TimelineTrack = {
        id: generateId(),
        type: 'video',
        name: 'Parallax Video Assets',
        order: 1,
        clips: [
          { id: generateId(), startTime: 0, duration: 30, content: _file.name, properties: {} },
        ],
      }
      setTracks([textTrack, videoTrack])
    }
  }, [assets, tracks])

  useEffect(() => {
    if (playing) {
      playbackRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1
          if (next >= 30) {
            setPlaying(false)
            return 0
          }
          return next
        })
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
  }, [playing])

  const togglePlayback = () => {
    if (currentTime >= 30) setCurrentTime(0)
    setPlaying((p) => !p)
  }

  const handleSeek = (time: number) => {
    setCurrentTime(time)
  }

  const handleExport = async () => {
    const projectName = brandName || 'Untitled Project'
    try {
      await fetch('/api/studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          sourceUrl: null,
          script,
          voiceProfile,
          audioTrack,
          tracks,
          assets,
        }),
      })
    } catch {
      // silent
    }
  }

  const resetAll = () => {
    setScript(null)
    setBrandName('')
    setTracks([])
    setAssets([])
    setLogs([])
    setCurrentTime(0)
    setPlaying(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Video Studio</h1>
          <p className="text-ink-light text-sm mt-1">Create stunning CTV ad creatives with AI</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={resetAll}>New Project</Button>
          <Button onClick={handleExport} disabled={!script && tracks.length === 0}>
            Export Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card overflow-hidden">
            <div className="flex border-b border-muted">
              <button
                onClick={() => setMode('url')}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  mode === 'url' ? 'text-accent bg-accent-light border-b-2 border-accent' : 'text-ink-light hover:text-ink'
                }`}
              >
                AI Auto
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  mode === 'manual' ? 'text-accent bg-accent-light border-b-2 border-accent' : 'text-ink-light hover:text-ink'
                }`}
              >
                Manual
              </button>
            </div>
            <div className="p-4">
              {mode === 'url' ? (
                <UrlPanel onScrape={handleScrape} scraping={scraping} logs={logs} script={script} />
              ) : (
                <ManualPanel
                  voiceProfile={voiceProfile}
                  audioTrack={audioTrack}
                  onVoiceChange={setVoiceProfile}
                  onAudioChange={setAudioTrack}
                  onAddAsset={handleAddAsset}
                />
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <VideoCanvas
            script={script}
            brandName={brandName}
            playing={playing}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
          />

          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={() => handleSeek(0)} disabled={!script && tracks.length === 0}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </Button>
            <Button
              onClick={togglePlayback}
              disabled={!script && tracks.length === 0}
              className="w-12 h-12 rounded-full p-0 flex items-center justify-center"
            >
              {playing ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </Button>
            <Button variant="ghost" onClick={() => handleSeek(30)} disabled={!script && tracks.length === 0}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </Button>
          </div>

          <TimelineEditor
            tracks={tracks}
            currentTime={currentTime}
            playing={playing}
            onSeek={handleSeek}
          />
        </div>
      </div>
    </div>
  )
}
