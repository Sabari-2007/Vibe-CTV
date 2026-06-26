'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { VOICE_PROFILES, AUDIO_TRACKS } from '@/lib/studio-types'

interface ManualPanelProps {
  voiceProfile: string | null
  audioTrack: string | null
  onVoiceChange: (id: string) => void
  onAudioChange: (id: string) => void
  onAddAsset: (file: File) => void
}

export function ManualPanel({
  voiceProfile,
  audioTrack,
  onVoiceChange,
  onAudioChange,
  onAddAsset,
}: ManualPanelProps) {
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onAddAsset(file)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-ink mb-1">Manual Editor</h3>
        <p className="text-xs text-ink-light">Upload assets and configure your video manually.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-accent bg-accent/5' : 'border-muted hover:border-accent/30 bg-canvas'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onAddAsset(f) }}
          className="hidden"
        />
        <svg className="w-6 h-6 mx-auto mb-2 text-ink-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-xs text-ink-light">Drop images or video here</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-ink-light">AI Voice Over</label>
        <div className="space-y-1.5">
          {VOICE_PROFILES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onVoiceChange(v.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 border ${
                  voiceProfile === v.id
                    ? 'bg-accent-light border-accent/30 text-accent'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-accent/20'
                }`}
            >
              <div className="font-medium">{v.label}</div>
              <div className="text-ink-light/60 mt-0.5">{v.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-ink-light">Background Audio</label>
        <div className="space-y-1.5">
          {AUDIO_TRACKS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAudioChange(a.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 border flex items-center justify-between ${
                  audioTrack === a.id
                    ? 'bg-accent-light border-accent/30 text-accent'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-accent/20'
                }`}
            >
              <span className="font-medium">{a.label}</span>
              <span className="text-ink-light/60">{a.duration}s</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
