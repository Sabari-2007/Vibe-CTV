'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'

interface StepThreeProps {
  videoUrl: string
  onChange: (url: string) => void
  summary: {
    name: string
    dailyBudget: string
    totalBudget: string
    genres: string[]
    locations: string[]
  }
}

export function StepThree({ videoUrl, onChange, summary }: StepThreeProps) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      onChange(URL.createObjectURL(file))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange(URL.createObjectURL(file))
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-ink mb-1">Creative & Review</h2>
        <p className="text-ink-light text-sm">Upload your video and review your campaign.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-3">
          Video Creative
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-accent bg-accent/5'
              : 'border-muted hover:border-accent/30 bg-canvas'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <svg
            className="w-8 h-8 mx-auto mb-3 text-ink-light"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-ink-light mb-1">
            {videoUrl ? 'Video selected — click to change' : 'Drop a video file here or click to browse'}
          </p>
          <p className="text-xs text-ink-light/50">MP4, WebM, or MOV</p>
        </div>
        {videoUrl && (
          <div className="mt-3">
            <video
              src={videoUrl}
              controls
              className="w-full max-h-48 rounded-lg"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink mb-1">
          Or paste a video URL
        </label>
        <Input
          placeholder="https://example.com/video.mp4"
          value={videoUrl}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      <div className="card p-5 space-y-2">
        <h4 className="text-sm font-medium text-ink">Campaign Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-ink-light">Name:</span>
          <span className="text-ink text-right">{summary.name}</span>
          <span className="text-ink-light">Daily Budget:</span>
          <span className="text-ink text-right">${summary.dailyBudget}</span>
          <span className="text-ink-light">Total Budget:</span>
          <span className="text-ink text-right">${summary.totalBudget}</span>
          <span className="text-ink-light">Genres:</span>
          <span className="text-ink text-right">{summary.genres.join(', ') || 'All'}</span>
          <span className="text-ink-light">Locations:</span>
          <span className="text-ink text-right">{summary.locations.join(', ') || 'All'}</span>
        </div>
      </div>
    </div>
  )
}
