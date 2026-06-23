export type TrackType = 'text' | 'video' | 'voiceover' | 'music'

export interface TimelineClip {
  id: string
  startTime: number
  duration: number
  content: string
  properties: Record<string, unknown>
}

export interface TimelineTrack {
  id: string
  type: TrackType
  name: string
  order: number
  clips: TimelineClip[]
}

export interface VideoAsset {
  id: string
  type: 'image' | 'video' | 'audio'
  url: string
  label: string
  order: number
}

export interface VideoProjectData {
  id: string
  name: string
  status: string
  sourceUrl: string | null
  script: string | null
  voiceProfile: string | null
  audioTrack: string | null
  tracks: TimelineTrack[]
  assets: VideoAsset[]
  createdAt: string
  updatedAt: string
}

export interface ScrapeResult {
  brandName: string
  logoUrl: string | null
  heroImages: string[]
  colors: string[]
  fonts: string[]
  testimonials: string[]
  headlines: string[]
  script: string
}

export interface ScrapeLog {
  step: number
  total: number
  message: string
}

export const VOICE_PROFILES = [
  { id: 'professional', label: 'Professional', description: 'Clear, authoritative brand voice' },
  { id: 'conversational', label: 'Conversational', description: 'Warm, friendly, approachable' },
  { id: 'high-energy', label: 'High-Energy', description: 'Dynamic, fast-paced, exciting' },
  { id: 'luxury', label: 'Luxury', description: 'Smooth, refined, premium' },
]

export const AUDIO_TRACKS = [
  { id: 'inspiring-cinematic', label: 'Inspiring Cinematic', duration: 30 },
  { id: 'upbeat-corporate', label: 'Upbeat Corporate', duration: 30 },
  { id: 'modern-tech', label: 'Modern Tech', duration: 30 },
  { id: 'ambient-drone', label: 'Ambient Drone', duration: 30 },
  { id: 'hip-hop-energy', label: 'Hip Hop Energy', duration: 30 },
]
