'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { generateQRDataUrl } from '@/lib/qrcode'
import { useClickSound, clickSound } from '@/lib/use-click-sound'
import { useUndo } from '@/lib/use-undo'
import { VOICE_PROFILES } from '@/lib/studio-types'

type Tool = 'select' | 'trim' | 'split' | 'text' | 'shape'
type Panel = 'media' | 'transitions' | 'effects'
type EditorTab = 'voice-script' | 'music' | 'qr' | 'export'

interface MediaClip {
  id: string
  name: string
  type: 'video' | 'audio' | 'image'
  duration: number
  src: string
  thumbnail?: string
}

interface Keyframe {
  time: number
  value: number
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

interface TrackClip {
  id: string
  mediaId: string
  name: string
  type: 'video' | 'audio' | 'image'
  startTime: number
  duration: number
  src: string
  volume: number
  muted: boolean
  locked: boolean
  color: string
  x: number
  y: number
  scale: number
  rotation: number
  brightness: number
  contrast: number
  saturation: number
  shadows: number
  highlights: number
  temperature: number
  transition?: string
  effect?: string
  text?: string
  keyframes?: Record<string, Keyframe[]>
  fadeIn?: number
  fadeOut?: number
}

interface Track {
  id: string
  name: string
  type: 'video' | 'audio' | 'text'
  clips: TrackClip[]
  locked: boolean
  muted: boolean
  visible: boolean
}

const TRACK_COLORS = [
  '#4f8cff', '#ff6b6b', '#51cf66', '#fcc419', '#cc5de8',
  '#20c997', '#ff922b', '#339af0', '#f06595', '#748ffc',
]

const TIMELINE_DURATION = 60
const BASE_PX_PER_SECOND = 80
const SNAP_THRESHOLD = 5
const TRACK_LABEL_WIDTH = 140

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

function interpolateKeyframes(keyframes: Keyframe[], time: number, clipStart: number, clipDuration: number): number {
  if (!keyframes || keyframes.length === 0) return 0
  const localTime = time - clipStart
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)
  if (localTime <= sorted[0].time) return sorted[0].value
  if (localTime >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value
  for (let i = 0; i < sorted.length - 1; i++) {
    if (localTime >= sorted[i].time && localTime < sorted[i + 1].time) {
      const t = (localTime - sorted[i].time) / (sorted[i + 1].time - sorted[i].time)
      let eased = t
      switch (sorted[i].easing) {
        case 'ease-in': eased = t * t; break
        case 'ease-out': eased = t * (2 - t); break
        case 'ease-in-out': eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; break
      }
      return sorted[i].value + (sorted[i + 1].value - sorted[i].value) * eased
    }
  }
  return sorted[sorted.length - 1].value
}

function getClipVolume(clip: TrackClip, time: number): number {
  let vol = clip.volume
  const localTime = time - clip.startTime
  if (clip.fadeIn && localTime < clip.fadeIn) {
    vol *= (localTime / clip.fadeIn)
  }
  if (clip.fadeOut && localTime > clip.duration - clip.fadeOut) {
    vol *= ((clip.duration - localTime) / clip.fadeOut)
  }
  const volKfs = clip.keyframes?.['volume']
  if (volKfs && volKfs.length > 0) {
    vol *= interpolateKeyframes(volKfs, time, clip.startTime, clip.duration)
  }
  return Math.max(0, Math.min(1, vol))
}

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface SlideData {
  id: string
  imageUrl: string
  label: string
}

export function VideoEditor({ onClose, initialSlides, initialBrand, sourceUrl }: {
  onClose?: () => void
  initialSlides?: SlideData[]
  initialBrand?: string
  sourceUrl?: string
}) {
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [activePanel, setActivePanel] = useState<Panel>('media')
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>('voice-script')
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hoverX, setHoverX] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: generateId(), name: 'Video 1', type: 'video',
      clips: [], locked: false, muted: false, visible: true,
    },
    {
      id: generateId(), name: 'Audio 1', type: 'audio',
      clips: [], locked: false, muted: false, visible: true,
    },
    {
      id: generateId(), name: 'Text 1', type: 'text',
      clips: [], locked: false, muted: false, visible: true,
    },
  ])
  const [mediaItems, setMediaItems] = useState<MediaClip[]>([])
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [draggingClip, setDraggingClip] = useState<{ trackId: string; clipId: string; offsetX: number } | null>(null)
  const [trimmingClip, setTrimmingClip] = useState<{ trackId: string; clipId: string; edge: 'start' | 'end' } | null>(null)
  const [snapIndicator, setSnapIndicator] = useState<number | null>(null)
  const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set())
  const [showExportModal, setShowExportModal] = useState(false)
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const [showLeftPanel, setShowLeftPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [scriptText, setScriptText] = useState(initialBrand
    ? `Ad for ${initialBrand}\n\nIntroducing ${initialBrand} â€” the solution you've been waiting for.\n\nWith cutting-edge features and seamless experience, ${initialBrand} is transforming the industry.\n\nVisit ${initialBrand.toLowerCase().replace(/\s+/g, '')}.com to learn more.`
    : '')
  const [voiceProfile, setVoiceProfile] = useState('professional')
  const [slides, setSlides] = useState<SlideData[]>(initialSlides || [])
  const [musicTracks, setMusicTracks] = useState<{ id: string; label: string; file: string; duration: number }[]>([])
  const [selectedMusicId, setSelectedMusicId] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clipId: string; trackId: string; time: number } | null>(null)
  const [exportStatus, setExportStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle')
  const [exportProgress, setExportProgress] = useState(0)
  const [exportUrl, setExportUrl] = useState('')
  const [voiceGenerating, setVoiceGenerating] = useState(false)
  const [voiceGenerated, setVoiceGenerated] = useState(false)
  const [voicePendingClip, setVoicePendingClip] = useState<{ name: string; type: 'audio'; startTime: number; duration: number; src: string } | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [qrEnabled, setQrEnabled] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const sourceUrlRef = useRef('')
  const menuRef = useRef<HTMLDivElement>(null)
  const exportCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const seen = localStorage.getItem('vibe-onboarding-seen')
    if (!seen) {
      setShowOnboarding(true)
      localStorage.setItem('vibe-onboarding-seen', 'true')
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (sourceUrl) sourceUrlRef.current = sourceUrl
  }, [sourceUrl])

  useEffect(() => {
    if (qrEnabled && sourceUrlRef.current) {
      setQrDataUrl(generateQRDataUrl(sourceUrlRef.current, 160))
    } else {
      setQrDataUrl('')
    }
  }, [qrEnabled])

  useEffect(() => {
    if (isPlaying) {
      const voiceTrack = tracks.find(t => t.name === 'Voiceover' && !t.muted)
      if (voiceTrack && voiceTrack.clips.length > 0) {
        const vClip = voiceTrack.clips[0]
        const localTime = currentTime - vClip.startTime
        if (localTime >= 0 && localTime < vClip.duration && scriptText.trim() && !window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel()
          const utter = new SpeechSynthesisUtterance(scriptText)
          const voices = window.speechSynthesis.getVoices()
          const voiceMap: Record<string, string[]> = {
            professional: ['Microsoft David', 'David', 'Google US English Male'],
            conversational: ['Google UK English Female', 'Microsoft Susan', 'Female'],
            'high-energy': ['Microsoft Zira', 'Zira', 'Google US English Female'],
            luxury: ['Google UK English Male', 'Microsoft Mark', 'Daniel'],
          }
          const searchTerms = voiceMap[voiceProfile] || ['Google US', 'Female']
          const matched = voices.find(v => searchTerms.some(t => v.name.includes(t)))
          if (matched) {
            utter.voice = matched
            utter.rate = voiceProfile === 'professional' ? 0.85
              : voiceProfile === 'conversational' ? 1.0
              : voiceProfile === 'high-energy' ? 1.25
              : 0.75
          } else {
            utter.rate = voiceProfile === 'professional' ? 0.9
              : voiceProfile === 'conversational' ? 1.0
              : voiceProfile === 'high-energy' ? 1.3
              : 0.8
          }
          utter.rate *= playbackSpeed
          utter.volume = volume
          window.speechSynthesis.speak(utter)
        }
      }
    } else {
      window.speechSynthesis.cancel()
    }
  }, [isPlaying, currentTime, tracks, scriptText, voiceProfile, volume, playbackSpeed])

  const generateVoiceover = useCallback(() => {
    if (!scriptText.trim()) return
    setVoiceGenerating(true)
    setVoiceGenerated(false)
    setVoicePendingClip(null)

    try {
      const utterance = new SpeechSynthesisUtterance(scriptText)
      const voices = window.speechSynthesis.getVoices()

      const voiceMap: Record<string, string[]> = {
        professional: ['Microsoft David', 'David', 'Google US English Male'],
        conversational: ['Google UK English Female', 'Microsoft Susan', 'Female'],
        'high-energy': ['Microsoft Zira', 'Zira', 'Google US English Female'],
        luxury: ['Google UK English Male', 'Microsoft Mark', 'Daniel'],
      }
      const searchTerms = voiceMap[voiceProfile] || ['Google US', 'Female']
      const matched = voices.find(v => searchTerms.some(t => v.name.includes(t)))
      if (matched) {
        utterance.voice = matched
        utterance.rate = voiceProfile === 'professional' ? 0.85
          : voiceProfile === 'conversational' ? 1.0
          : voiceProfile === 'high-energy' ? 1.25
          : 0.75
        utterance.pitch = voiceProfile === 'professional' ? 1.0
          : voiceProfile === 'conversational' ? 1.1
          : voiceProfile === 'high-energy' ? 1.2
          : 0.85
      } else {
        utterance.rate = voiceProfile === 'professional' ? 0.9
          : voiceProfile === 'conversational' ? 1.0
          : voiceProfile === 'high-energy' ? 1.3
          : 0.8
      }
      utterance.volume = 1

      window.speechSynthesis.speak(utterance)

      const estimatedDuration = Math.max(5, Math.ceil(scriptText.split(' ').length / 3))

      utterance.onend = () => {
        setVoiceGenerating(false)
        setVoiceGenerated(true)
        setVoicePendingClip({
          name: 'Voiceover', type: 'audio' as const,
          startTime: 0, duration: estimatedDuration, src: '',
        })
      }

      utterance.onerror = () => {
        setVoiceGenerating(false)
        setVoiceGenerated(true)
        setVoicePendingClip({
          name: 'Voiceover', type: 'audio' as const,
          startTime: 0, duration: estimatedDuration, src: '',
        })
      }
    } catch {
      setVoiceGenerating(false)
    }
  }, [scriptText, voiceProfile])

  const confirmVoiceover = useCallback(() => {
    if (!voicePendingClip) return
    let voiceTrack = tracks.find(t => t.name === 'Voiceover' && !t.locked)
    if (!voiceTrack) {
      const newTrack: Track = {
        id: generateId(), name: 'Voiceover', type: 'audio',
        clips: [], locked: false, muted: false, visible: true,
      }
      setTracks((prev) => [...prev, newTrack])
      voiceTrack = newTrack
    }
    setTracks((prev) => prev.map((tr) => {
      if (tr.id !== voiceTrack!.id) return tr
      return {
        ...tr,
        clips: [...tr.clips, {
          id: generateId(), mediaId: 'voiceover', name: voicePendingClip.name, type: 'audio' as const,
          startTime: voicePendingClip.startTime, duration: voicePendingClip.duration, src: voicePendingClip.src,
          volume: 1, muted: false, locked: false, color: '#cc5de8',
          x: 0, y: 0, scale: 100, rotation: 0,
          brightness: 0, contrast: 0, saturation: 0, shadows: 0, highlights: 0, temperature: 0,
          transition: undefined, effect: undefined,
        }],
      }
    }))
    setVoicePendingClip(null)
  }, [voicePendingClip, tracks])

  function initMusicAudio(src: string) {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause()
      musicAudioRef.current.src = ''
    }
    const audio = new Audio(src)
    audio.loop = false
    audio.volume = 0.7
    musicAudioRef.current = audio
    musicSrcRef.current = src
  }

  function seekMusicAudio(time: number) {
    const audio = musicAudioRef.current
    if (!audio || !audio.src) return
    audio.currentTime = time
  }

  function setMusicTrackClip(track: { id: string; label: string; file: string; duration: number } | null) {
    setTracks((prev) => {
      const audioTrack = prev.find(t => t.type === 'audio' && !t.locked)
      if (!audioTrack) return prev
      if (!track) {
        return prev.map(tr => tr.id === audioTrack.id ? { ...tr, clips: [] } : tr)
      }
      return prev.map(tr => {
        if (tr.id !== audioTrack.id) return tr
        return {
          ...tr,
          clips: [{
            id: generateId(), mediaId: `music-${track.id}`, name: track.label, type: 'audio' as const,
            startTime: 0, duration: track.duration, src: `/music/${track.file}`,
            volume: 0.7, muted: false, locked: false, color: '#51cf66',
            x: 0, y: 0, scale: 100, rotation: 0,
            brightness: 0, contrast: 0, saturation: 0, shadows: 0, highlights: 0, temperature: 0,
            transition: undefined, effect: undefined,
          }],
        }
      })
    })
  }

  useEffect(() => {
    fetch('/music/manifest.json')
      .then(r => r.json())
      .then(data => {
        setMusicTracks(data)
        if (data.length > 0 && !selectedMusicId) {
          initMusicAudio(`/music/${data[0].file}`)
          setMusicTrackClip(data[0])
          setSelectedMusicId(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedMusicId) {
      const track = musicTracks.find(m => m.id === selectedMusicId)
      if (track) {
        const src = `/music/${track.file}`
        if (src !== musicSrcRef.current) {
          initMusicAudio(src)
        }
        setMusicTrackClip(track)
      }
    } else {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause()
        musicAudioRef.current.src = ''
        musicSrcRef.current = ''
      }
      setMusicTrackClip(null)
    }
  }, [selectedMusicId])

  function normalizeUrl(url: string) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('//')) return `https:${url}`
    return `https://${url}`
  }

  useEffect(() => {
    if (initialSlides && initialSlides.length > 0) {
      setSlides(initialSlides.map((s) => ({ ...s, imageUrl: normalizeUrl(s.imageUrl) })))
      setTracks((prev) => {
        const videoTrack = prev.find(t => t.type === 'video' && !t.locked)
        if (!videoTrack) return prev
        const clips = initialSlides.map((slide, i) => ({
          id: generateId(), mediaId: `slide-${slide.id}`, name: slide.label, type: 'image' as const,
          startTime: i * 4, duration: 4, src: normalizeUrl(slide.imageUrl),
          volume: 1, muted: false, locked: false, color: TRACK_COLORS[i % TRACK_COLORS.length],
          x: 0, y: 0, scale: 100, rotation: 0,
          brightness: 0, contrast: 0, saturation: 0, shadows: 0, highlights: 0, temperature: 0,
          transition: undefined, effect: undefined,
        }))
        return prev.map((tr) =>
          tr.id === videoTrack.id ? { ...tr, clips } : tr
        )
      })
    }
  }, [initialSlides])

  useEffect(() => {
    const activeIds = new Set(tracks.flatMap(t => t.clips).map(c => c.id))
    videoRefs.current.forEach((_, id) => { if (!activeIds.has(id)) videoRefs.current.delete(id) })
    audioRefs.current.forEach((_, id) => { if (!activeIds.has(id)) audioRefs.current.delete(id) })
  }, [tracks])

  const timelineRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const playbackRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tracksHistoryRef = useRef<Track[][]>([])
  const tracksFutureRef = useRef<Track[][]>([])

  const saveTrackSnapshot = useCallback(() => {
    tracksHistoryRef.current = [...tracksHistoryRef.current.slice(-49), JSON.parse(JSON.stringify(tracks))]
    tracksFutureRef.current = []
  }, [tracks])

  const selectedClipIdRef = useRef<string | null>(null)
  selectedClipIdRef.current = selectedClipId

  const togglePlaybackRef = useRef<() => void>(() => {})
  const removeClipRef = useRef<(id: string) => void>(() => {})
  const duplicateClipRef = useRef<() => void>(() => {})
  const addTextClipRef = useRef<() => void>(() => {})
  const undoTracksRef = useRef<() => void>(() => {})
  const redoTracksRef = useRef<() => void>(() => {})

  const undoTracks = useCallback(() => {
    const history = tracksHistoryRef.current
    if (history.length === 0) return
    const previous = history[history.length - 1]
    tracksHistoryRef.current = history.slice(0, -1)
    tracksFutureRef.current = [JSON.parse(JSON.stringify(tracks)), ...tracksFutureRef.current]
    setTracks(previous)
  }, [tracks])
  undoTracksRef.current = undoTracks

  const redoTracks = useCallback(() => {
    const future = tracksFutureRef.current
    if (future.length === 0) return
    const next = future[0]
    tracksFutureRef.current = future.slice(1)
    tracksHistoryRef.current = [...tracksHistoryRef.current, JSON.parse(JSON.stringify(tracks))]
    setTracks(next)
  }, [tracks])
  redoTracksRef.current = redoTracks

  const pxPerSecond = BASE_PX_PER_SECOND * zoom
  const totalDuration = TIMELINE_DURATION

  const startExport = useCallback(async () => {
    const loadImage = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.referrerPolicy = 'no-referrer'
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error(`Failed to load: ${url}`))
        img.src = url
      })
    setExportStatus('rendering')
    setExportProgress(0)

    const imageClips = tracks.flatMap(t => t.clips).filter(c => c.type === 'image' && c.src)
    setExportProgress(2)
    const loadedImages = new Map<string, HTMLImageElement>()
    await Promise.all(imageClips.map(async (clip) => {
      try {
        const img = await loadImage(clip.src)
        loadedImages.set(clip.src, img)
      } catch {}
    }))
    setExportProgress(5)

    const canvas = exportCanvasRef.current
    if (!canvas) { setExportStatus('error'); return }
    const ctx = canvas.getContext('2d')
    if (!ctx) { setExportStatus('error'); return }

    const fps = 30
    const totalFrames = Math.ceil(totalDuration * fps)
    const stream = canvas.captureStream(fps)
    let mediaRecorder: MediaRecorder
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
    } catch {
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      } catch {
        setExportStatus('error')
        return
      }
    }
    const chunks: Blob[] = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setExportUrl(url)
      setExportStatus('done')
    }

    mediaRecorder.start()

    for (let frame = 0; frame < totalFrames; frame++) {
      ctx.clearRect(0, 0, 1920, 1080)
      ctx.fillStyle = '#0d0d1a'
      ctx.fillRect(0, 0, 1920, 1080)

      const time = (frame / fps)
      for (const track of tracks) {
        if (!track.visible) continue
        for (const clip of track.clips) {
          if (time < clip.startTime || time >= clip.startTime + clip.duration) continue

          ctx.save()
          ctx.translate(960, 540)
          ctx.scale(clip.scale / 100, clip.scale / 100)
          ctx.rotate((clip.rotation * Math.PI) / 180)
          ctx.translate(-960, -540)
          ctx.translate(clip.x, clip.y)

          if (clip.type === 'image' && clip.src) {
            const img = loadedImages.get(clip.src)
            if (img) {
              ctx.drawImage(img, 0, 0, 1920, 1080)
            }
          }

          ctx.restore()
        }
      }

      setExportProgress(Math.round(5 + (frame / totalFrames) * 90))
      await new Promise(r => setTimeout(r, 0))
    }

    mediaRecorder.stop()
  }, [tracks, totalDuration])

  useEffect(() => {
    if (isPlaying) {
      playbackRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.033 * playbackSpeed
          if (next >= totalDuration) {
            setIsPlaying(false)
            return 0
          }
          return next
        })
      }, 33)
    } else {
      if (playbackRef.current) {
        clearInterval(playbackRef.current)
        playbackRef.current = null
      }
    }
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current)
    }
  }, [isPlaying, totalDuration, playbackSpeed])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlaybackRef.current()
          break
        case 'ArrowLeft':
          e.preventDefault()
          setCurrentTime((prev) => Math.max(0, prev - 0.5))
          break
        case 'ArrowRight':
          e.preventDefault()
          setCurrentTime((prev) => Math.min(TIMELINE_DURATION, prev + 0.5))
          break
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            undoTracksRef.current()
          }
          break
        case 'KeyY':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            redoTracksRef.current()
          }
          break
        case 'KeyV':
          clickSound()
          setActiveTool('select')
          break
        case 'KeyC':
          clickSound()
          setActiveTool('trim')
          break
        case 'KeyS':
          clickSound()
          setActiveTool('split')
          break
        case 'KeyT':
          clickSound()
          setActiveTool('text')
          addTextClipRef.current()
          break
        case 'KeyD':
          clickSound()
          duplicateClipRef.current()
          break
        case 'Delete':
        case 'Backspace':
          if (selectedClipIdRef.current) {
            removeClipRef.current(selectedClipIdRef.current)
          }
          break
        case 'KeyF':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.()
          } else {
            document.exitFullscreen?.()
          }
          break
        case 'Escape':
          setSelectedClipId(null)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const togglePlayback = useCallback(() => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0)
    }
    setIsPlaying((prev) => !prev)
  }, [currentTime, totalDuration])
  togglePlaybackRef.current = togglePlayback

  function pauseAllAudio() {
    const musicAudio = musicAudioRef.current
    if (musicAudio && musicAudio.src) musicAudio.pause()
    audioRefs.current.forEach(a => a.pause())
  }

  function seekAllAudio(time: number, shouldPlay: boolean) {
    const musicAudio = musicAudioRef.current
    if (musicAudio && musicAudio.src) {
      musicAudio.currentTime = time
      if (shouldPlay) musicAudio.play().catch(() => {})
    }
    const t = tracksRef.current
    audioRefs.current.forEach((audio, clipId) => {
      const clip = t.flatMap(tr => tr.clips).find(c => c.id === clipId)
      if (clip && clip.src) {
        const localTime = time - clip.startTime
        if (localTime >= 0 && localTime <= clip.duration) {
          audio.currentTime = localTime
          if (shouldPlay) audio.play().catch(() => {})
        }
      }
    })
  }

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current || draggingClip || trimmingClip) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft - TRACK_LABEL_WIDTH
    const time = Math.max(0, Math.min(totalDuration, x / pxPerSecond))
    pauseAllAudio()
    setCurrentTime(time)
    seekAllAudio(time, isPlayingRef.current)
  }, [totalDuration, pxPerSecond, draggingClip, trimmingClip])

  const handleSeek = (time: number) => {
    const t = Math.max(0, Math.min(totalDuration, time))
    pauseAllAudio()
    setCurrentTime(t)
    seekAllAudio(t, isPlayingRef.current)
  }

  const toggleTrackCollapse = (trackId: string) => {
    setCollapsedTracks((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  const handleImportMedia = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newMedia: MediaClip[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image'
      const url = URL.createObjectURL(file)
      const estimatedDur = type === 'audio' ? 30 : 10
      newMedia.push({
        id: generateId(),
        name: file.name,
        type,
        duration: estimatedDur,
        src: url,
      })
    }
    setMediaItems((prev) => [...prev, ...newMedia])
    setShowMediaMenu(false)
    e.target.value = ''
  }

  const getSnapTime = (time: number, excludeClipId?: string): number | null => {
    let snap: number | null = null
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.id === excludeClipId) continue
        if (Math.abs(clip.startTime - time) * pxPerSecond < SNAP_THRESHOLD) {
          snap = clip.startTime
        }
        if (Math.abs((clip.startTime + clip.duration) - time) * pxPerSecond < SNAP_THRESHOLD) {
          snap = clip.startTime + clip.duration
        }
      }
    }
    return snap
  }

  const handleClipDragStart = (trackId: string, clipId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedClipId(clipId)
    const clip = tracks.find(t => t.id === trackId)?.clips.find(c => c.id === clipId)
    if (!clip) return
    const rect = timelineRef.current?.getBoundingClientRect()
    const scrollLeft = timelineRef.current?.scrollLeft || 0
    const mouseTime = rect ? (e.clientX - rect.left + scrollLeft - TRACK_LABEL_WIDTH) / pxPerSecond : 0
    setDraggingClip({ trackId, clipId, offsetX: mouseTime - clip.startTime })
  }

  const handleClipDragMove = useCallback((e: MouseEvent) => {
    if (!draggingClip || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const scrollLeft = timelineRef.current.scrollLeft || 0
    const mouseTime = Math.max(0, (e.clientX - rect.left + scrollLeft - TRACK_LABEL_WIDTH) / pxPerSecond)
    const newStart = mouseTime - draggingClip.offsetX

    setTracks((prev) => {
      return prev.map((track) => {
        if (track.id !== draggingClip.trackId) return track
        return {
          ...track,
          clips: track.clips.map((clip) => {
            if (clip.id !== draggingClip.clipId) return clip
            return { ...clip, startTime: Math.max(0, newStart) }
          }),
        }
      })
    })
  }, [draggingClip, pxPerSecond])

  const handleClipDragEnd = useCallback(() => {
    if (draggingClip) saveTrackSnapshot()
    setDraggingClip(null)
    setSnapIndicator(null)
  }, [draggingClip, saveTrackSnapshot])

  useEffect(() => {
    if (draggingClip) {
      window.addEventListener('mousemove', handleClipDragMove)
      window.addEventListener('mouseup', handleClipDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleClipDragMove)
        window.removeEventListener('mouseup', handleClipDragEnd)
      }
    }
  }, [draggingClip, handleClipDragMove, handleClipDragEnd])

  const handleTrimStart = (trackId: string, clipId: string, edge: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedClipId(clipId)
    setTrimmingClip({ trackId, clipId, edge })
  }

  const handleTrimMove = useCallback((e: MouseEvent) => {
    if (!trimmingClip || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft
    const time = Math.max(0, Math.min(totalDuration, x / pxPerSecond))

    setTracks((prev) => {
      return prev.map((track) => {
        if (track.id !== trimmingClip.trackId) return track
        return {
          ...track,
          clips: track.clips.map((clip) => {
            if (clip.id !== trimmingClip.clipId) return clip
            const minDur = 0.5
            if (trimmingClip.edge === 'start') {
              const newStart = Math.min(time, clip.startTime + clip.duration - minDur)
              const newDuration = clip.duration - (newStart - clip.startTime)
              return { ...clip, startTime: newStart, duration: newDuration }
            } else {
              const newEnd = Math.max(time, clip.startTime + minDur)
              return { ...clip, duration: newEnd - clip.startTime }
            }
          }),
        }
      })
    })
  }, [trimmingClip, totalDuration, pxPerSecond])

  const handleTrimEnd = useCallback(() => {
    if (trimmingClip) saveTrackSnapshot()
    setTrimmingClip(null)
  }, [trimmingClip, saveTrackSnapshot])

  useEffect(() => {
    if (trimmingClip) {
      window.addEventListener('mousemove', handleTrimMove)
      window.addEventListener('mouseup', handleTrimEnd)
      return () => {
        window.removeEventListener('mousemove', handleTrimMove)
        window.removeEventListener('mouseup', handleTrimEnd)
      }
    }
  }, [trimmingClip, handleTrimMove, handleTrimEnd])

  const splitClipAt = (clipId: string, splitTime?: number) => {
    const time = splitTime ?? currentTime
    saveTrackSnapshot()
    setTracks((prev) => {
      return prev.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId)
        if (clipIdx === -1) return track
        const clip = track.clips[clipIdx]
        if (time <= clip.startTime || time >= clip.startTime + clip.duration) return track

        const leftDuration = time - clip.startTime
        if (leftDuration < 0.3) return track

        const rightDuration = clip.duration - leftDuration
        if (rightDuration < 0.3) return track

        const newClip: TrackClip = {
          ...clip,
          id: generateId(),
          startTime: time,
          duration: rightDuration,
        }
        const updatedClip = { ...clip, duration: leftDuration }
        const newClips = [...track.clips]
        newClips[clipIdx] = updatedClip
        newClips.splice(clipIdx + 1, 0, newClip)
        return { ...track, clips: newClips }
      })
    })
  }

  const splitClip = () => {
    if (!selectedClipId) return
    setTracks((prev) => {
      return prev.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === selectedClipId)
        if (clipIdx === -1) return track
        const clip = track.clips[clipIdx]
        if (currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) return track

        const leftDuration = currentTime - clip.startTime
        if (leftDuration < 0.3) return track

        const rightDuration = clip.duration - leftDuration
        if (rightDuration < 0.3) return track

        const newClip: TrackClip = {
          ...clip,
          id: generateId(),
          startTime: currentTime,
          duration: rightDuration,
        }
        const updatedClip = { ...clip, duration: leftDuration }
        const newClips = [...track.clips]
        newClips[clipIdx] = updatedClip
        newClips.splice(clipIdx + 1, 0, newClip)
        return { ...track, clips: newClips }
      })
    })
  }

  const removeClip = useCallback((clipId: string) => {
    saveTrackSnapshot()
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== clipId),
      }))
    )
    setSelectedClipId(null)
  }, [saveTrackSnapshot])
  removeClipRef.current = removeClip

  const addTrack = (type: 'video' | 'audio' | 'text') => {
    saveTrackSnapshot()
    const count = tracks.filter((t) => t.type === type).length + 1
    const typeName = type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : 'Text'
    setTracks((prev) => [
      ...prev,
      {
        id: generateId(),
        name: `${typeName} ${count}`,
        type,
        clips: [],
        locked: false,
        muted: false,
        visible: true,
      },
    ])
  }

  const duplicateClip = useCallback(() => {
    if (!selectedClipId) return
    saveTrackSnapshot()
    setTracks((prev) =>
      prev.map((track) => {
        const clip = track.clips.find((c) => c.id === selectedClipId)
        if (!clip) return track
        return {
          ...track,
          clips: [
            ...track.clips,
            {
              ...clip,
              id: generateId(),
              startTime: Math.min(clip.startTime + clip.duration + 0.5, totalDuration - clip.duration),
            },
          ],
        }
      })
    )
  }, [selectedClipId, totalDuration, saveTrackSnapshot])
  duplicateClipRef.current = duplicateClip

  const addTextClip = useCallback(() => {
    saveTrackSnapshot()
    const textTrack = tracks.find(t => t.type === 'text' && !t.locked)
    const newClip: TrackClip = {
      id: generateId(), mediaId: 'text', name: 'Double-click to edit', type: 'image',
      startTime: currentTime, duration: 4, src: '', volume: 1, muted: false, locked: false,
      color: '#fcc419', x: 0, y: 0, scale: 100, rotation: 0,
      brightness: 0, contrast: 0, saturation: 0, shadows: 0, highlights: 0, temperature: 0,
      transition: undefined, effect: undefined, text: 'Your Text Here',
    }
    setSelectedClipId(newClip.id)
    if (!textTrack) {
      const count = tracks.filter(t => t.type === 'text').length + 1
      const newTrack: Track = { id: generateId(), name: `Text ${count}`, type: 'text', clips: [newClip], locked: false, muted: false, visible: true }
      setTracks((prev) => [...prev, newTrack])
    } else {
      setTracks((prev) => prev.map((t) => t.id === textTrack.id ? { ...t, clips: [...t.clips, newClip] } : t))
    }
  }, [tracks, currentTime, saveTrackSnapshot])
  addTextClipRef.current = addTextClip

  const updateClipProp = useCallback((clipId: string, key: string, value: number) => {
    setTracks((prev) => prev.map((t) => ({
      ...t,
      clips: t.clips.map((c) => c.id === clipId ? { ...c, [key]: value } : c),
    })))
  }, [])

  const selectedClip = (() => {
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.id === selectedClipId) return clip
      }
    }
    return null
  })()

  const selectedTrack = (() => {
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.id === selectedClipId) return track
      }
    }
    return null
  })()

  const totalTracksWidth = totalDuration * pxPerSecond

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const mediaId = e.dataTransfer.getData('text/plain')
    const slideUrl = e.dataTransfer.getData('application/slide-url')
    const slideLabel = e.dataTransfer.getData('application/slide-label')

    const media = mediaItems.find((m) => m.id === mediaId)
    if (!media && !slideUrl) return

    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft
    const time = Math.max(0, x / pxPerSecond)

    if (slideUrl) {
      const trackType = 'video'
      let targetTrack = tracks.find((t) => t.type === trackType && !t.locked)
      if (!targetTrack) {
        const count = tracks.filter((t) => t.type === trackType).length + 1
        targetTrack = {
          id: generateId(), name: `Video ${count}`, type: trackType,
          clips: [], locked: false, muted: false, visible: true,
        }
        setTracks((prev) => [...prev, targetTrack!])
      }
      const colorIdx = targetTrack.clips.length % TRACK_COLORS.length
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id !== targetTrack!.id) return t
          return {
            ...t,
            clips: [
              ...t.clips,
              {
                id: generateId(), mediaId: `slide-${generateId()}`, name: slideLabel || 'Slide', type: 'image',
                startTime: time, duration: 4, src: slideUrl,
                volume: 1, muted: false, locked: false, color: TRACK_COLORS[colorIdx],
                x: 0, y: 0, scale: 100, rotation: 0,
                brightness: 0, contrast: 0, saturation: 0, shadows: 0, highlights: 0, temperature: 0,
                transition: undefined, effect: undefined,
              },
            ],
          }
        })
      )
      return
    }

    if (!media) return
    const trackType = media.type === 'audio' ? 'audio' : 'video'
    let targetTrack = tracks.find((t) => t.type === trackType && !t.locked)
    if (!targetTrack) {
      const count = tracks.filter((t) => t.type === trackType).length + 1
      const typeName = trackType === 'video' ? 'Video' : 'Audio'
      targetTrack = {
        id: generateId(),
        name: `${typeName} ${count}`,
        type: trackType,
        clips: [],
        locked: false,
        muted: false,
        visible: true,
      }
      setTracks((prev) => [...prev, targetTrack!])
    }

    const colorIdx = targetTrack.clips.length % TRACK_COLORS.length
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== targetTrack!.id) return t
        return {
          ...t,
          clips: [
            ...t.clips,
            {
              id: generateId(),
              mediaId: media.id, name: media.name, type: media.type,
              startTime: time, duration: media.duration, src: media.src,
              volume: 1, muted: false, locked: false, color: TRACK_COLORS[colorIdx],
              x: 0, y: 0, scale: 100, rotation: 0,
              brightness: 0, contrast: 0, saturation: 0, shadows: 0, highlights: 0, temperature: 0, transition: undefined, effect: undefined,
            },
          ],
        }
      })
    )
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const playheadPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  const activeClips = useMemo(() => {
    const result: { clip: TrackClip; track: Track }[] = []
    for (const track of tracks) {
      if (!track.visible) continue
      for (const clip of track.clips) {
        if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
          result.push({ clip, track })
        }
      }
    }
    return result
  }, [tracks, currentTime])

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  const tracksRef = useRef(tracks)
  tracksRef.current = tracks
  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)
  const musicSrcRef = useRef('')
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying

  useEffect(() => {
    if (isPlaying) {
      const ct = currentTimeRef.current
      videoRefs.current.forEach((video, clipId) => {
        const clip = tracksRef.current.flatMap(tr => tr.clips).find(c => c.id === clipId)
        if (clip) {
          const localTime = ct - clip.startTime
          if (localTime >= 0 && localTime <= clip.duration) {
            video.currentTime = localTime
          }
        }
        video.play().catch(() => {})
      })
      audioRefs.current.forEach((audio, clipId) => {
        const clip = tracksRef.current.flatMap(tr => tr.clips).find(c => c.id === clipId)
        if (clip && clip.src) {
          const localTime = ct - clip.startTime
          if (localTime >= 0 && localTime <= clip.duration) {
            audio.currentTime = localTime
          }
        }
        audio.play().catch(() => {})
      })
      const musicAudio = musicAudioRef.current
      if (musicAudio && musicAudio.src) {
        musicAudio.currentTime = ct
        musicAudio.play().catch(() => {})
      }
    } else {
      videoRefs.current.forEach((video) => video.pause())
      audioRefs.current.forEach((audio) => audio.pause())
      if (musicAudioRef.current) musicAudioRef.current.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    videoRefs.current.forEach((video, clipId) => {
      const clip = tracks.flatMap(t => t.clips).find(c => c.id === clipId)
      if (clip) {
        const localTime = currentTime - clip.startTime
        if (localTime >= 0 && localTime <= clip.duration && Math.abs(video.currentTime - localTime) > 0.3) {
          video.currentTime = localTime
        }
      }
    })
    audioRefs.current.forEach((audio, clipId) => {
      const clip = tracks.flatMap(t => t.clips).find(c => c.id === clipId)
      if (clip && clip.src) {
        const localTime = currentTime - clip.startTime
        if (localTime < 0 || localTime > clip.duration) {
          audio.pause()
          return
        }
        audio.volume = clip.volume * volume
      }
    })
  }, [currentTime, tracks, isPlaying])

  const onboardingSteps = [
    { target: 'file-menu', text: 'File menu: New, Open, Save, and Export your project.' },
    { target: 'edit-menu', text: 'Edit menu: Undo, Redo, Split clips, and more.' },
    { target: 'trim-menu', text: 'Trim menu: Trim in/out points and ripple delete.' },
    { target: 'view-menu', text: 'View menu: Zoom, snap, and fullscreen.' },
    { target: 'help-menu', text: 'Help menu: keyboard shortcuts and rewatch this tour.' },
    { target: 'media-panel', text: 'Media panel: import and browse your media assets.', side: 'right' as const },
    { target: 'timeline-area', text: 'Timeline: drag clips freely and arrange your edit.', side: 'top' as const },
    { target: 'data-export-btn', text: 'Export button: render and share your final video.' },
  ]

  const [onboardingStep, setOnboardingStep] = useState(0)

  const handleOnboardingNext = () => {
    if (onboardingStep < onboardingSteps.length - 1) {
      setOnboardingStep(onboardingStep + 1)
    } else {
      setShowOnboarding(false)
      localStorage.setItem('vibe-onboarding-seen', 'true')
    }
  }

  const handleSkipOnboarding = () => {
    setShowOnboarding(false)
    localStorage.setItem('vibe-onboarding-seen', 'true')
  }

  return (
    <div className="bg-[#1a1a2e] flex flex-col overflow-hidden select-none min-h-[calc(100vh-4rem)] rounded-xl">
      <input ref={fileInputRef} type="file" multiple accept="video/*,audio/*,image/*" className="hidden" onChange={handleFileImport} />

      <div className="h-10 bg-[#16162a] border-b border-white/[0.06] flex items-center px-4 gap-6 shrink-0">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#4f8cff] to-[#6c5ce7] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">Vibe Studio</span>
        </div>

          <div ref={menuRef} className="flex items-center gap-2 text-xs relative">
            {([
              { label: 'New', id: 'new-project', action: () => window.location.reload() },
              { label: 'Export', id: 'export-btn', action: () => { const btn = document.querySelector('[data-export-btn]') as HTMLButtonElement; if (btn) btn.click() } },
              { label: 'Help', id: 'help-menu', action: () => setShowOnboarding(true) },
            ] as const).map((menu) => (
              <button
                key={menu.label}
                id={menu.id}
                onClick={() => { clickSound(); menu.action() }}
                className="px-3 py-1.5 rounded transition-all text-white/50 hover:text-white hover:bg-white/[0.06]"
              >
                {menu.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-xs">
          <span className="text-white/40 font-mono">{formatTime(currentTime)}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/40 font-mono">{formatTime(totalDuration)}</span>
          <span className="text-white/20 mx-1">|</span>
          <span className="text-white/30 text-[10px]">{Math.round(currentTime / totalDuration * 100)}%</span>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.()
              } else {
                document.exitFullscreen?.()
              }
            }}
            className="w-7 h-7 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-all"
            title="Toggle Fullscreen (F)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="h-12 bg-[#16162a] border-b border-white/[0.06] flex items-center px-4 gap-1 shrink-0">
        <ToolbarButton active={activeTool === 'select'} onClick={() => { clickSound(); setActiveTool('select') }} shortcut="V" label="Select">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
          </svg>
        </ToolbarButton>
        <ToolbarButton active={activeTool === 'trim'} onClick={() => { clickSound(); setActiveTool('trim') }} shortcut="C" label="Trim">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.16a15.53 15.53 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        </ToolbarButton>
        <div className="w-px h-6 bg-white/[0.06] mx-1" />
        <ToolbarButton active={false} onClick={() => { clickSound(); splitClip() }} shortcut="S" label="Split">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        </ToolbarButton>
        <ToolbarButton active={false} onClick={() => { clickSound(); addTextClip() }} shortcut="T" label="Text">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </ToolbarButton>
        <div className="w-px h-6 bg-white/[0.06] mx-1" />
        <div className="w-px h-6 bg-white/[0.06] mx-1" />
        <ToolbarButton active={false} onClick={() => { clickSound(); if (selectedClipId) splitClipAt(selectedClipId) }} shortcut="X" label="Cut">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 4v16M18 4v16M6 12h12" />
          </svg>
        </ToolbarButton>
        <ToolbarButton active={false} onClick={() => { clickSound(); duplicateClip() }} shortcut="D" label="Duplicate">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
        </ToolbarButton>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => { clickSound(); setShowSpeedMenu(!showSpeedMenu) }}
            className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/[0.06] transition-all font-mono"
          >
            {playbackSpeed}x
          </button>
          {showSpeedMenu && (
            <div className="absolute top-12 right-4 bg-[#252540] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 z-50">
              {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false) }}
                  className={`block w-full px-4 py-1.5 rounded-lg text-xs text-left transition-all ${
                    playbackSpeed === speed ? 'bg-[#4f8cff]/20 text-[#4f8cff]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
          <button
            data-export-btn
            onClick={() => { clickSound(); setShowExportModal(true) }}
            className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] text-white text-xs font-semibold hover:brightness-110 transition-all shadow-lg shadow-[#4f8cff]/20"
          >
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <button
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          className="lg:hidden fixed left-2 top-[50%] -translate-y-1/2 z-50 w-8 h-8 rounded-full bg-[#252540] border border-white/[0.08] flex items-center justify-center shadow-xl hover:bg-[#2a2a4a] transition-all"
          title="Toggle Media Panel"
        >
          <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {showLeftPanel && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowLeftPanel(false)} />
        )}

        <div className={`${showLeftPanel ? 'fixed left-0 top-0 bottom-0 z-50' : 'hidden'} lg:flex lg:w-60 bg-[#16162a] border-r border-white/[0.06] flex-col shrink-0`}>
        <div className="flex items-center border-b border-white/[0.06]">
          <div className="flex flex-1">
            {(['media', 'transitions', 'effects'] as Panel[]).map((panel) => (
              <button
                key={panel}
                onClick={() => { clickSound(); setActivePanel(panel) }}
                className={`flex-1 py-2.5 text-[10px] font-medium uppercase tracking-wider transition-all ${
                  activePanel === panel
                    ? 'text-[#4f8cff] bg-[#4f8cff]/[0.06] border-b-2 border-[#4f8cff]'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {panel}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowLeftPanel(false)}
            className="lg:hidden w-7 h-7 mr-1 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {activePanel === 'media' && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Project Media</span>
                  <button
                    onClick={() => setShowMediaMenu(true)}
                    className="w-6 h-6 rounded-lg hover:bg-white/[0.08] flex items-center justify-center transition-all"
                  >
                    <svg className="w-3.5 h-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
                {showMediaMenu && (
                  <div className="absolute top-36 left-4 bg-[#252540] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 z-50 w-44">
                    <button onClick={handleImportMedia} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Import from computer
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                      Import from URL
                    </button>
                    <div className="border-t border-white/[0.06] my-1" />
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                      Create folder
                    </button>
                  </div>
                )}
                {slides.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06] mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Slides</span>
                      <span className="text-[9px] text-white/20">{slides.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {slides.map((slide) => (
                        <div
                          key={slide.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', slide.id)
                            e.dataTransfer.setData('application/slide-url', slide.imageUrl)
                            e.dataTransfer.setData('application/slide-label', slide.label)
                          }}
                          className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] cursor-grab active:cursor-grabbing transition-all border border-transparent hover:border-white/[0.06]"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#fcc419]/20 flex items-center justify-center shrink-0 overflow-hidden">
                            {slide.imageUrl ? (
                              <img src={slide.imageUrl} alt={slide.label} className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                            ) : (
                              <svg className="w-5 h-5 text-[#fcc419]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-white/70 truncate">{slide.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] cursor-grab active:cursor-grabbing transition-all border border-transparent hover:border-white/[0.06]"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === 'video' ? 'bg-[#4f8cff]/20 text-[#4f8cff]' :
                      item.type === 'audio' ? 'bg-[#51cf66]/20 text-[#51cf66]' :
                      'bg-[#fcc419]/20 text-[#fcc419]'
                    }`}>
                      {item.type === 'video' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H4.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      ) : item.type === 'audio' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/70 truncate">{item.name}</p>
                      <p className="text-[10px] text-white/30 font-mono">{formatTimeShort(item.duration)}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
            {activePanel === 'transitions' && (
              <div className="space-y-2">
                <p className="text-[10px] text-white/40 mb-2">Select a clip, then apply a transition</p>
                {['Cross Dissolve', 'Fade to Black', 'Wipe Left', 'Wipe Right', 'Zoom In', 'Slide'].map((t) => {
                  const isApplied = selectedClip?.transition === t
                  return (
                    <div key={t}
                      onClick={() => {
                        if (!selectedClipId) return
                        setTracks((prev) => prev.map((tr) => ({
                          ...tr,
                          clips: tr.clips.map((c) =>
                            c.id === selectedClipId
                              ? { ...c, transition: c.transition === t ? undefined : t }
                              : c
                          ),
                        })))
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                        isApplied
                          ? 'bg-[#cc5de8]/20 border-[#cc5de8]/40 text-[#cc5de8]'
                          : 'hover:bg-white/[0.04] border-transparent hover:border-white/[0.06] text-white/60'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#cc5de8]/20 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-[#cc5de8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6-6m0 0l6 6m-6-6v12" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs">{t}</span>
                        {isApplied && (
                          <span className="text-[9px] text-[#cc5de8]/60 block">Applied</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {activePanel === 'effects' && (
              <div className="space-y-2">
                <p className="text-[10px] text-white/40 mb-2">Select a clip, then apply an effect</p>
                {['Blur', 'Brightness', 'Contrast', 'Saturation', 'Sepia', 'Grayscale', 'Vignette', 'Glow'].map((e) => {
                  const isApplied = selectedClip?.effect === e
                  return (
                    <div key={e}
                      onClick={() => {
                        if (!selectedClipId) return
                        setTracks((prev) => prev.map((tr) => ({
                          ...tr,
                          clips: tr.clips.map((c) =>
                            c.id === selectedClipId
                              ? { ...c, effect: c.effect === e ? undefined : e }
                              : c
                          ),
                        })))
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                        isApplied
                          ? 'bg-[#20c997]/20 border-[#20c997]/40 text-[#20c997]'
                          : 'hover:bg-white/[0.04] border-transparent hover:border-white/[0.06] text-white/60'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#20c997]/20 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-[#20c997]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs">{e}</span>
                        {isApplied && (
                          <span className="text-[9px] text-[#20c997]/60 block">Applied</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.06] p-3 space-y-1.5">
            <button onClick={() => addTrack('video')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H4.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Add Video Track
            </button>
            <button onClick={() => addTrack('audio')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
              Add Audio Track
            </button>
            <button onClick={() => addTrack('text')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              Add Text Track
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={canvasRef}
            className="flex-1 bg-black flex items-center justify-center relative min-h-0 overflow-hidden"
            onDoubleClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.()
              } else {
                document.exitFullscreen?.()
              }
            }}
            onClick={(e) => {
              if (activeTool === 'text') {
                const rect = canvasRef.current?.getBoundingClientRect()
                if (!rect) return
                const x = ((e.clientX - rect.left) / rect.width) * 1920 - 960
                const y = ((e.clientY - rect.top) / rect.height) * 1080 - 540
                const textTrack = tracks.find(t => t.type === 'text' && !t.locked)
                if (textTrack) {
                  const newClip: TrackClip = {
                    id: generateId(), mediaId: 'text', name: 'Text', type: 'image',
                    startTime: currentTime, duration: 4, src: '', volume: 1, muted: false, locked: false,
                    color: '#fcc419', x, y, scale: 100, rotation: 0,
                    brightness: 0, contrast: 0, saturation: 0, shadows: 0, highlights: 0, temperature: 0,
                    transition: undefined, effect: undefined, text: 'Your Text',
                  }
                  setSelectedClipId(newClip.id)
                  setTracks((prev) => prev.map((t) => t.id === textTrack.id ? { ...t, clips: [...t.clips, newClip] } : t))
                }
                setActiveTool('select')
              }
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative aspect-video max-w-full max-h-full bg-[#0d0d1a] rounded-none md:rounded-lg overflow-hidden shadow-2xl border border-white/[0.04] m-4" style={{ width: 'min(80vh * 16/9, 90%)', height: 'auto' }}>
                {activeClips.length === 0 && (
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 grid-bg opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-3/4 h-3/4">
                        <div className="absolute inset-0 rounded-full bg-[#4f8cff]/5 blur-[80px]" />
                        <div className="absolute top-1/3 left-1/3 w-24 h-24 rounded-full bg-[#4f8cff]/10 blur-[50px]" />
                        <div className="absolute bottom-1/3 right-1/3 w-32 h-32 rounded-full bg-[#6c5ce7]/10 blur-[60px]" />
                      </div>
                    </div>
                  </div>
                )}

                {activeClips.map(({ clip, track }) => {
                  const localTime = currentTime - clip.startTime
                  const kf = clip.keyframes || {}
                  const kfX = kf['x'] ? interpolateKeyframes(kf['x'], currentTime, clip.startTime, clip.duration) : clip.x
                  const kfY = kf['y'] ? interpolateKeyframes(kf['y'], currentTime, clip.startTime, clip.duration) : clip.y
                  const kfScale = kf['scale'] ? interpolateKeyframes(kf['scale'], currentTime, clip.startTime, clip.duration) : clip.scale
                  const kfRot = kf['rotation'] ? interpolateKeyframes(kf['rotation'], currentTime, clip.startTime, clip.duration) : clip.rotation
                  const kfOp = kf['opacity'] ? interpolateKeyframes(kf['opacity'], currentTime, clip.startTime, clip.duration) : (clip.type !== 'audio' ? 1 : 0)
                  const clipVol = getClipVolume(clip, currentTime)
                  return (
                    <div key={clip.id}
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        opacity: kfOp,
                        transform: `translate(${kfX}px, ${kfY}px) scale(${kfScale / 100}) rotate(${kfRot}deg)`,
                        filter: (() => {
                          let f = `brightness(${1 + clip.brightness / 100}) contrast(${1 + clip.contrast / 100}) saturate(${1 + clip.saturation / 100})`
                          if (clip.effect === 'Blur') f += ' blur(4px)'
                          else if (clip.effect === 'Sepia') f += ' sepia(0.8)'
                          else if (clip.effect === 'Grayscale') f += ' grayscale(1)'
                          else if (clip.effect === 'Brightness') f += ' brightness(1.5)'
                          else if (clip.effect === 'Contrast') f += ' contrast(1.5)'
                          else if (clip.effect === 'Saturation') f += ' saturate(2)'
                          else if (clip.effect === 'Vignette') f += ' brightness(0.7) contrast(1.2)'
                          else if (clip.effect === 'Glow') f += ' brightness(1.3) saturate(1.3) blur(0.5px)'
                          return f
                        })(),
                      }}
                    >
                      {clip.type === 'video' && clip.src && (
                        <video
                          ref={(el) => {
                            if (el) {
                              videoRefs.current.set(clip.id, el)
                              el.volume = clip.volume * volume
                              el.muted = clip.muted || track.muted || volume === 0
                              if (Math.abs(el.currentTime - localTime) > 0.1) {
                                el.currentTime = localTime
                              }
                            }
                          }}
                          src={clip.src}
                          className="w-full h-full object-contain"
                          playsInline
                          autoPlay={isPlaying}
                        />
                      )}
                      {clip.type === 'image' && clip.src && (
                        <img src={clip.src} alt={clip.name} className="w-full h-full object-contain" draggable={false} crossOrigin="anonymous" referrerPolicy="no-referrer" />
                      )}
                      {clip.type === 'image' && !clip.src && clip.text && (
                        <div
                          className="absolute inset-0 flex items-center justify-center cursor-move"
                          style={{ transform: `translate(${clip.x}px, ${clip.y}px)` }}
                          onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id) }}
                        >
                          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/20 max-w-[80%]">
                            {selectedClipId === clip.id ? (
                              <input
                                type="text"
                                value={clip.text}
                                onChange={(e) => {
                                  setTracks((prev) => prev.map((t) => ({
                                    ...t,
                                    clips: t.clips.map((c) => c.id === clip.id ? { ...c, text: e.target.value, name: e.target.value } : c)
                                  })))
                                }}
                                className="bg-transparent text-white text-center text-2xl font-bold outline-none border-b-2 border-[#4f8cff] w-full"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="text-white text-2xl font-bold text-center block">{clip.text}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {clip.type === 'video' && !clip.src && (
                        <div className="flex flex-col items-center justify-center text-white/30">
                          <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H4.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          <span className="text-xs">{clip.name}</span>
                        </div>
                      )}
                      {clip.type === 'image' && !clip.src && (
                        <div className="flex flex-col items-center justify-center text-white/30">
                          <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                          <span className="text-xs">{clip.name}</span>
                        </div>
                      )}
                      {clip.type === 'audio' && (
                        <div className="flex flex-col items-center justify-center text-white/30">
                          <audio
                            ref={(el) => {
                              if (el) {
                                audioRefs.current.set(clip.id, el)
                              el.volume = clipVol * volume
                                el.muted = clip.muted || track.muted
                              }
                            }}
                            src={clip.src}
                            className="hidden"
                            autoPlay={isPlaying}
                          />
                          <svg className="w-16 h-16 mb-2 text-[#51cf66]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                          </svg>
                          <span className="text-xs">{clip.name}</span>
                          <div className="flex items-center gap-0.5 mt-2 h-8">
                            {Array.from({ length: 40 }).map((_, i) => (
                              <div key={i}
                                className="w-1 rounded-full bg-[#51cf66]"
                                style={{
                                  height: `${4 + Math.sin(i * 0.3 + localTime * 2) * 10 + Math.random() * 4}px`,
                                  opacity: 0.3 + Math.sin(i * 0.2 + localTime) * 0.3,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {tracks.map((track) => {
                  const transitionClips = track.clips.filter(c => c.transition)
                  return transitionClips.map((clip) => {
                    const nextClip = track.clips
                      .filter(c => c.startTime > clip.startTime)
                      .sort((a, b) => a.startTime - b.startTime)[0]
                    if (!nextClip) return null
                    const transitionStart = clip.startTime + clip.duration - 0.5
                    const transitionEnd = clip.startTime + clip.duration + 0.5
                    if (currentTime < transitionStart || currentTime > transitionEnd) return null
                    const progress = (currentTime - transitionStart) / (transitionEnd - transitionStart)
                    return (
                      <div key={`transition-${clip.id}`} className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="absolute inset-0" style={{
                          background: clip.transition === 'Fade to Black'
                            ? `rgba(0,0,0,${progress})`
                            : clip.transition === 'Cross Dissolve'
                            ? `rgba(0,0,0,${progress * 0.3})`
                            : 'transparent',
                          opacity: clip.transition === 'Slide' ? 1 - progress : 1,
                          transform: clip.transition === 'Wipe Left'
                            ? `translateX(${(1 - progress) * 100}%)`
                            : clip.transition === 'Wipe Right'
                            ? `translateX(${-(1 - progress) * 100}%)`
                            : clip.transition === 'Zoom In'
                            ? `scale(${1 + (1 - progress) * 0.3})`
                            : 'none',
                        }} />
                        <span className="text-[10px] text-white/30 bg-black/40 px-2 py-0.5 rounded-full">{clip.transition}</span>
                      </div>
                    )
                  })
                })}

                {qrEnabled && qrDataUrl && (
                  <div className="absolute top-4 right-20 z-20 w-24 h-24 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg bg-[#1a1a2e]">
                    <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
                  </div>
                )}

                <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-white/70 font-medium border border-white/10">
                  Preview
                </div>

                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[10px] text-white/50 font-mono border border-white/10">
                  {formatTime(currentTime)}
                </div>

                {activeClips.length === 0 && !selectedClip && (
                  <div className="absolute bottom-16 left-0 right-0 text-center">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
                      <button onClick={togglePlayback} className="w-8 h-8 rounded-full bg-[#4f8cff] flex items-center justify-center hover:brightness-110 transition-all">
                        {isPlaying ? (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        )}
                      </button>
                      <span className="text-white/40 text-[10px] font-mono">{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] transition-all duration-75"
                    style={{ width: `${playheadPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-10 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center px-4 gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => { clickSound(); togglePlayback() }} className="w-8 h-8 rounded-lg bg-[#4f8cff]/10 hover:bg-[#4f8cff]/20 flex items-center justify-center transition-all" title="Play/Pause (Space)">
                {isPlaying ? (
                  <svg className="w-4 h-4 text-[#4f8cff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-[#4f8cff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                )}
              </button>
              <button onClick={() => { clickSound(); handleSeek(0) }} className="w-7 h-7 rounded-md hover:bg-[#E2E8F0] flex items-center justify-center transition-all">
                <svg className="w-3 h-3 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </button>
              <button onClick={() => { clickSound(); handleSeek(currentTime - 1) }} className="w-7 h-7 rounded-md hover:bg-[#E2E8F0] flex items-center justify-center transition-all">
                <svg className="w-3 h-3 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button onClick={() => { clickSound(); handleSeek(currentTime + 1) }} className="w-7 h-7 rounded-md hover:bg-[#E2E8F0] flex items-center justify-center transition-all">
                <svg className="w-3 h-3 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <button onClick={() => { clickSound(); handleSeek(totalDuration) }} className="w-7 h-7 rounded-md hover:bg-[#E2E8F0] flex items-center justify-center transition-all">
                <svg className="w-3 h-3 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                </svg>
              </button>
            </div>

            <div className="w-px h-4 bg-[#E2E8F0]" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setVolume(volume === 0 ? 1 : 0)}
                className="w-6 h-6 rounded-md hover:bg-[#E2E8F0] flex items-center justify-center transition-all"
              >
                {volume === 0 ? (
                  <svg className="w-3.5 h-3.5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 accent-[#4f8cff] cursor-pointer"
              />
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1 text-[10px] text-[#64748B] font-mono">
              <button
                onClick={() => setZoom((prev) => Math.max(0.25, prev - 0.25))}
                className="w-5 h-5 rounded hover:bg-[#E2E8F0] flex items-center justify-center"
              >
                <svg className="w-2.5 h-2.5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                </svg>
              </button>
              <span className="w-8 text-center text-[#64748B]">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((prev) => Math.min(4, prev + 0.25))}
                className="w-5 h-5 rounded hover:bg-[#E2E8F0] flex items-center justify-center"
              >
                <svg className="w-2.5 h-2.5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              <input
                type="range"
                min="0.25"
                max="4"
                step="0.25"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-20 h-1 accent-[#4f8cff] cursor-pointer ml-1"
              />
            </div>
          </div>

          <div
            ref={timelineRef}
            className="h-64 bg-[#1a1a2e] border-t border-white/[0.06] overflow-x-auto overflow-y-auto relative group"
            onClick={handleTimelineClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMouseMove={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const x = e.clientX - rect.left + ((e.currentTarget as HTMLElement).scrollLeft || 0) - TRACK_LABEL_WIDTH
              setHoverX(x)
            }}
            onMouseLeave={() => setHoverX(null)}
          >
            <div className="relative transition-all duration-100" style={{ width: `${Math.max(totalTracksWidth, 1000)}px`, minHeight: '100%' }}>
              {hoverX !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-[#2563EB]/30 pointer-events-none z-20"
                  style={{ left: `${TRACK_LABEL_WIDTH + hoverX}px` }}
                />
              )}
              <div className="h-7 bg-[#16162a] border-b border-white/[0.06] sticky top-0 z-20 flex" style={{ paddingLeft: `${TRACK_LABEL_WIDTH}px` }}>
                {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => {
                  const x = TRACK_LABEL_WIDTH + i * pxPerSecond
                  const isMajor = i % 5 === 0
                  return (
                    <div key={i} className="absolute top-0 h-full" style={{ left: `${x}px` }}>
                      <div className="absolute bottom-0 left-0 w-px h-2 bg-white/20" />
                      {isMajor && (
                        <span className="absolute top-1 left-1.5 text-[9px] text-white/30 font-mono whitespace-nowrap">
                          {formatTimeShort(i)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {tracks.map((track, trackIdx) => {
                const isCollapsed = collapsedTracks.has(track.id)
                const trackHeight = isCollapsed ? 28 : 48
                return (
                  <div key={track.id} className="relative border-b border-white/[0.03]">
                    <div
                      className="flex items-center bg-[#16162a] border-r border-white/[0.06] sticky left-0 z-10"
                      style={{ position: 'absolute', left: 0, top: 0, width: 140, height: trackHeight }}
                    >
                      <button
                        onClick={() => toggleTrackCollapse(track.id)}
                        className="w-4 h-4 flex items-center justify-center text-white/20 hover:text-white/60 ml-1"
                      >
                        <svg className={`w-2.5 h-2.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 px-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TRACK_COLORS[trackIdx % TRACK_COLORS.length] }} />
                        <span className="text-[10px] text-white/50 truncate">{track.name}</span>
                      </div>
                      <div className="flex items-center gap-0.5 pr-1">
                        <button
                          onClick={() => {
                            setTracks((prev) => prev.map((t) => t.id === track.id ? { ...t, visible: !t.visible } : t))
                          }}
                          className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                            track.visible ? 'text-white/40 hover:text-white/70' : 'text-white/10'
                          }`}
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {track.visible ? (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            )}
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setTracks((prev) => prev.map((t) => t.id === track.id ? { ...t, muted: !t.muted } : t))
                          }}
                          className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                            track.muted ? 'text-red-400/60' : 'text-white/40 hover:text-white/70'
                          }`}
                        >
                          {track.muted ? (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                          ) : (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="relative" style={{ marginLeft: 140, height: trackHeight }}>
                      {track.visible && (
                        <div className="absolute inset-0 bg-white/[0.01]" />
                      )}

                      {!isCollapsed && track.visible && track.clips.map((clip) => {
                        const left = clip.startTime * pxPerSecond
                        const width = clip.duration * pxPerSecond
                        const isSelected = clip.id === selectedClipId
                        return (
                          <div
                            key={clip.id}
                            className={`absolute rounded-md flex items-center cursor-pointer group transition-shadow ${
                              isSelected ? 'z-10 ring-2 ring-[#4f8cff] shadow-lg shadow-[#4f8cff]/20' : 'hover:brightness-110'
                            }`}
                            style={{
                              left: `${left}px`,
                              top: '3px',
                              width: `${Math.max(width, 8)}px`,
                              height: '42px',
                              backgroundColor: `${clip.color}20`,
                              borderLeft: `3px solid ${clip.color}`,
                            }}
                            onMouseDown={(e) => handleClipDragStart(track.id, clip.id, e)}
                            onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id) }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              const rect = timelineRef.current?.getBoundingClientRect()
                              const scrollLeft = timelineRef.current?.scrollLeft || 0
                              const clickTime = rect ? Math.max(0, Math.min(totalDuration, (e.clientX - rect.left + scrollLeft - 140) / pxPerSecond)) : currentTime
                              setContextMenu({ x: e.clientX, y: e.clientY, clipId: clip.id, trackId: track.id, time: clickTime })
                              setSelectedClipId(clip.id)
                            }}
                          >
                            <div className="flex items-center gap-1.5 px-2 min-w-0 w-full">
                              {clip.type === 'audio' ? (
                                <div className="flex items-center gap-px h-4">
                                  {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="w-0.5 bg-white/30 rounded-full" style={{ height: `${4 + Math.sin(i * 0.8 + clip.startTime) * 6}px` }} />
                                  ))}
                                </div>
                              ) : clip.type === 'image' ? (
                                <svg className="w-3 h-3 text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H4.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                              )}
                              <span className="text-[10px] text-white/70 font-mono truncate">{clip.name}</span>
                            </div>

                            {isSelected && activeTool === 'trim' && (
                              <>
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-2 bg-white/40 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-white/60 transition-all rounded-l-md"
                                  onMouseDown={(e) => handleTrimStart(track.id, clip.id, 'start', e)}
                                />
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-white/60 transition-all rounded-r-md"
                                  onMouseDown={(e) => handleTrimStart(track.id, clip.id, 'end', e)}
                                />
                              </>
                            )}

                            <div className="absolute -top-3 left-0 right-0 text-[8px] text-white/30 font-mono opacity-0 group-hover:opacity-100 transition-opacity px-1">
                              {formatTime(clip.startTime)}
                            </div>
                            <div className="absolute -bottom-3 left-0 right-0 text-[8px] text-white/30 font-mono opacity-0 group-hover:opacity-100 transition-opacity text-right px-1">
                              {formatTime(clip.startTime + clip.duration)}
                            </div>
                          </div>
                        )
                      })}
                      {track.clips.map((clip, ci) => {
                        if (!clip.transition) return null
                        const nextClip = track.clips[ci + 1]
                        if (!nextClip) return null
                        const overlapLeft = (clip.startTime + clip.duration - 0.5) * pxPerSecond
                        const overlapWidth = 1 * pxPerSecond
                        return (
                          <div
                            key={`tl-trans-${clip.id}`}
                            className="absolute top-0 z-20 flex items-center justify-center pointer-events-none"
                            style={{
                              left: `${overlapLeft}px`,
                              width: `${overlapWidth}px`,
                              height: '48px',
                            }}
                          >
                            <div className="bg-[#cc5de8]/30 border border-[#cc5de8]/50 rounded-md px-1.5 py-0.5 text-[8px] text-[#cc5de8] font-semibold whitespace-nowrap truncate max-w-full text-center leading-tight">
                              {clip.transition}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#4f8cff] to-[#6c5ce7] z-30 pointer-events-none shadow-lg shadow-[#4f8cff]/50"
                style={{ left: `${TRACK_LABEL_WIDTH + currentTime * pxPerSecond}px` }}
              >
                <div className="w-3 h-3 rounded-full bg-[#4f8cff] -ml-[5px] -mt-1 shadow-lg shadow-[#4f8cff]/50" />
              </div>
            </div>
          </div>
        </div>

        {contextMenu && (
          <div
            className="fixed inset-0 z-[300]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              className="absolute bg-[#252540] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 w-48"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { splitClipAt(contextMenu.clipId, contextMenu.time); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
                Split Clip
              </button>
              <button
                onClick={() => { removeClip(contextMenu.clipId); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete Clip
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="lg:hidden fixed right-2 top-[50%] -translate-y-1/2 z-50 w-8 h-8 rounded-full bg-[#252540] border border-white/[0.08] flex items-center justify-center shadow-xl hover:bg-[#2a2a4a] transition-all"
          title="Toggle Editor Panel"
        >
          <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5z" />
          </svg>
        </button>

        {showRightPanel && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowRightPanel(false)} />
        )}

        <div className={`${showRightPanel ? 'fixed right-0 top-0 bottom-0 z-50' : 'hidden'} lg:flex lg:w-72 bg-[#16162a] border-l border-white/[0.06] flex-col shrink-0`}>
          {selectedClip && (
            <div className="p-3 border-b border-white/[0.06] space-y-2 max-h-48 overflow-y-auto shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Clip: {selectedClip.name}</span>
                <button onClick={() => setSelectedClipId(null)} className="text-[9px] text-white/30 hover:text-white/60 transition-all">Deselect</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[8px] text-white/30 block">Fade In</label>
                  <input type="number" min="0" max={selectedClip.duration} step="0.1" value={selectedClip.fadeIn || 0}
                    onChange={(e) => { saveTrackSnapshot(); updateClipProp(selectedClip.id, 'fadeIn', parseFloat(e.target.value) || 0) }}
                    className="w-full px-1.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-[10px] text-white/60 focus:outline-none focus:border-[#4f8cff]"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-white/30 block">Fade Out</label>
                  <input type="number" min="0" max={selectedClip.duration} step="0.1" value={selectedClip.fadeOut || 0}
                    onChange={(e) => { saveTrackSnapshot(); updateClipProp(selectedClip.id, 'fadeOut', parseFloat(e.target.value) || 0) }}
                    className="w-full px-1.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-[10px] text-white/60 focus:outline-none focus:border-[#4f8cff]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-white/30">
                <span>Keyframes:</span>
                <button onClick={() => {
                  saveTrackSnapshot()
                  setTracks((prev) => prev.map((t) => ({
                    ...t,
                    clips: t.clips.map((c) => c.id === selectedClip.id ? {
                      ...c,
                      keyframes: {
                        ...c.keyframes,
                        x: [...(c.keyframes?.x || []), { time: currentTime - c.startTime, value: c.x, easing: 'linear' as const }],
                        y: [...(c.keyframes?.y || []), { time: currentTime - c.startTime, value: c.y, easing: 'linear' as const }],
                      }
                    } : c)
                  })))
                }} className="px-2 py-0.5 rounded bg-[#4f8cff]/20 text-[#4f8cff] hover:bg-[#4f8cff]/30 transition-all">+ Position</button>
                <button onClick={() => {
                  saveTrackSnapshot()
                  setTracks((prev) => prev.map((t) => ({
                    ...t,
                    clips: t.clips.map((c) => c.id === selectedClip.id ? {
                      ...c,
                      keyframes: {
                        ...c.keyframes,
                        scale: [...(c.keyframes?.scale || []), { time: currentTime - c.startTime, value: c.scale, easing: 'linear' as const }],
                      }
                    } : c)
                  })))
                }} className="px-2 py-0.5 rounded bg-[#fcc419]/20 text-[#fcc419] hover:bg-[#fcc419]/30 transition-all">+ Scale</button>
                <button onClick={() => {
                  saveTrackSnapshot()
                  setTracks((prev) => prev.map((t) => ({
                    ...t,
                    clips: t.clips.map((c) => c.id === selectedClip.id ? {
                      ...c,
                      keyframes: {
                        ...c.keyframes,
                        rotation: [...(c.keyframes?.rotation || []), { time: currentTime - c.startTime, value: c.rotation, easing: 'linear' as const }],
                      }
                    } : c)
                  })))
                }} className="px-2 py-0.5 rounded bg-[#cc5de8]/20 text-[#cc5de8] hover:bg-[#cc5de8]/30 transition-all">+ Rotate</button>
              </div>
              {selectedClip.keyframes && Object.keys(selectedClip.keyframes).length > 0 && (
                <div className="text-[8px] text-white/30">
                  {Object.entries(selectedClip.keyframes).map(([prop, kfs]) => (
                    <div key={prop} className="flex items-center gap-1 mt-0.5">
                      <span className="text-[#4f8cff] font-mono">{prop}:</span>
                      {kfs.map((kf, i) => (
                        <span key={i} className="text-white/40 font-mono">@{kf.time.toFixed(1)}s={kf.value.toFixed(0)}</span>
                      ))}
                      <button onClick={() => {
                        saveTrackSnapshot()
                        setTracks((prev) => prev.map((t) => ({
                          ...t,
                          clips: t.clips.map((c) => c.id === selectedClip.id ? {
                            ...c,
                            keyframes: Object.fromEntries(
                              Object.entries(c.keyframes || {}).filter(([k]) => k !== prop)
                            ),
                          } : c)
                        })))
                      }} className="text-red-400 hover:text-red-300 ml-1">x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center border-b border-white/[0.06]">
            <div className="flex flex-1">
              {(['voice-script', 'music', 'qr', 'export'] as EditorTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { clickSound(); setActiveEditorTab(tab) }}
                  className={`flex-1 py-2.5 text-[10px] font-medium uppercase tracking-wider transition-all ${
                    activeEditorTab === tab
                      ? 'text-[#4f8cff] bg-[#4f8cff]/[0.06] border-b-2 border-[#4f8cff]'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {tab === 'voice-script' ? 'Voice & Script' : tab === 'qr' ? 'QR Code' : tab === 'export' ? 'Export' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRightPanel(false)}
              className="lg:hidden w-7 h-7 mr-1 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeEditorTab === 'voice-script' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Voice &amp; Script</h3>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1.5">Script</label>
                  <textarea
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="Write or paste your script here..."
                    rows={8}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-white/80 font-mono focus:outline-none focus:border-[#4f8cff] transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1.5">Voice Profile</label>
                  <select
                    value={voiceProfile}
                    onChange={(e) => setVoiceProfile(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/[0.06] rounded-lg text-xs text-white/80 focus:outline-none focus:border-[#4f8cff] transition-all"
                    style={{ colorScheme: 'dark' }}
                  >
                    {VOICE_PROFILES.map((vp) => (
                      <option key={vp.id} value={vp.id} className="bg-[#1a1a2e] text-white/90">{vp.label} â€” {vp.description}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => { clickSound(); generateVoiceover() }}
                  disabled={!scriptText.trim() || voiceGenerating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] text-white text-xs font-semibold hover:brightness-110 transition-all shadow-lg shadow-[#4f8cff]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {voiceGenerating ? 'Generating...' : 'Generate Voiceover'}
                </button>
                {voiceGenerated && !voicePendingClip && (
                  <div className="bg-[#4f8cff]/10 border border-[#4f8cff]/20 rounded-xl p-3 text-center">
                    <svg className="w-6 h-6 mx-auto mb-1 text-[#4f8cff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                    <p className="text-xs text-[#4f8cff]">Voiceover generated â€” review and confirm below</p>
                  </div>
                )}
                {voicePendingClip && (
                  <div className="bg-[#51cf66]/10 border border-[#51cf66]/20 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#51cf66]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-[#51cf66] font-medium">Voiceover ready</p>
                    </div>
                    <p className="text-[10px] text-white/40">Duration: {voicePendingClip.duration}s</p>
                    <button
                      onClick={() => { clickSound(); confirmVoiceover() }}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-[#51cf66] to-[#20c997] text-white text-xs font-semibold hover:brightness-110 transition-all"
                    >
                      Confirm & Add to Timeline
                    </button>
                    <button
                      onClick={() => { clickSound(); setVoicePendingClip(null); setVoiceGenerated(false) }}
                      className="w-full py-1.5 rounded-lg text-[10px] text-white/40 hover:text-white/70 transition-all"
                    >
                      Discard & Regenerate
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeEditorTab === 'music' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Background Music</h3>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                  <label className="text-xs text-white/60 block mb-2">Select Music Track</label>
                  <select
                    value={selectedMusicId}
                    onChange={(e) => setSelectedMusicId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/[0.06] rounded-lg text-xs text-white/80 focus:outline-none focus:border-[#4f8cff] transition-all"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-[#1a1a2e] text-white/50">-- No music --</option>
                    {musicTracks.map((mt) => (
                      <option key={mt.id} value={mt.id} className="bg-[#1a1a2e] text-white/90">{mt.label}</option>
                    ))}
                  </select>
                </div>
                <div
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'audio/*'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (!file) return
                      const url = URL.createObjectURL(file)
                      const audioTrack = tracks.find(t => t.type === 'audio' && !t.locked)
                      if (!audioTrack) return
                      setTracks((prev) => prev.map((tr) => {
                        if (tr.id !== audioTrack.id) return tr
                        return {
                          ...tr,
                          clips: [{
                            id: generateId(), mediaId: `custom-${file.name}`, name: file.name, type: 'audio' as const,
                            startTime: 0, duration: 30, src: url,
                            volume: 0.7, muted: false, locked: false, color: '#51cf66',
                            x: 0, y: 0, scale: 100, rotation: 0,
                            brightness: 0, contrast: 0, saturation: 0, shadows: 0, highlights: 0, temperature: 0,
                            transition: undefined, effect: undefined,
                          }],
                        }
                      }))
                      setSelectedMusicId('')
                    }
                    input.click()
                  }}
                  className="border-2 border-dashed border-white/[0.08] rounded-xl p-4 text-center cursor-pointer hover:border-[#4f8cff]/40 transition-all"
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-white/40">Upload Your Own Music</p>
                  <p className="text-[10px] text-white/20 mt-1">MP3, WAV, OGG</p>
                </div>
                {tracks.filter(t => t.type === 'audio').map((track, idx) => (
                  <div key={track.id} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TRACK_COLORS[idx % TRACK_COLORS.length] }} />
                        <span className="text-xs text-white/60">{track.name}</span>
                      </div>
                      <span className="text-[10px] text-white/30">{track.clips.length} clip{track.clips.length !== 1 ? 's' : ''}</span>
                    </div>
                    {track.clips.map((clip) => (
                      <div key={clip.id} className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-white/30 truncate flex-1">{clip.name}</span>
                        <input
                          type="range" min="0" max="1" step="0.05"
                          value={clip.volume}
                          onChange={(e) => updateClipProp(clip.id, 'volume', parseFloat(e.target.value))}
                          className="w-20 h-1 accent-[#51cf66] cursor-pointer"
                        />
                        <span className="text-[9px] text-white/40 font-mono w-7 text-right">{Math.round(clip.volume * 100)}%</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {activeEditorTab === 'qr' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">QR Code</h3>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-white/60">Show QR on Slides</label>
                    <button
                      onClick={() => {
                        setQrEnabled(!qrEnabled)
                        if (!qrEnabled && sourceUrlRef.current) {
                          setQrDataUrl(generateQRDataUrl(sourceUrlRef.current, 160))
                        }
                      }}
                      className={`relative w-10 h-5 rounded-full transition-all ${
                        qrEnabled ? 'bg-[#4f8cff]' : 'bg-white/20'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        qrEnabled ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                  {qrEnabled && qrDataUrl && (
                    <div className="space-y-3">
                      <div className="bg-[#1a1a2e] rounded-lg p-2 flex items-center justify-center border border-white/[0.06]">
                        <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" />
                      </div>
                      <p className="text-[10px] text-white/40 break-all">{sourceUrlRef.current || 'No URL loaded'}</p>
                      <p className="text-[10px] text-white/30">QR appears at top-right corner of your video</p>
                    </div>
                  )}
                  {!qrEnabled && (
                    <p className="text-[10px] text-white/30 mt-1">Toggle on to generate a QR code linking to your website</p>
                  )}
                </div>
              </div>
            )}

            {activeEditorTab === 'export' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Export Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1.5">Resolution</label>
                    <select className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/[0.06] rounded-lg text-xs text-white/80 focus:outline-none focus:border-[#4f8cff] transition-all" style={{ colorScheme: 'dark' }}>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>1920x1080 (Full HD)</option>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>3840x2160 (4K)</option>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>1280x720 (HD)</option>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>854x480 (SD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1.5">Format</label>
                    <select className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/[0.06] rounded-lg text-xs text-white/80 focus:outline-none focus:border-[#4f8cff] transition-all" style={{ colorScheme: 'dark' }}>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>MP4 (H.264)</option>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>MOV (ProRes)</option>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>AVI</option>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>GIF</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1.5">Frame Rate</label>
                    <select className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/[0.06] rounded-lg text-xs text-white/80 focus:outline-none focus:border-[#4f8cff] transition-all" style={{ colorScheme: 'dark' }}>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>60 fps</option>
                      <option selected style={{ background: '#1a1a2e', color: '#ccc' }}>30 fps</option>
                      <option style={{ background: '#1a1a2e', color: '#ccc' }}>24 fps</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1.5">Quality</label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      defaultValue={90}
                      className="w-full h-1 accent-[#4f8cff] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-white/30 mt-0.5">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => { clickSound(); setShowExportModal(true) }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] text-white text-sm font-semibold hover:brightness-110 transition-all shadow-lg shadow-[#4f8cff]/20"
                    >
                      Export Video
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowExportModal(false)}>
          <div className="w-[480px] bg-[#252540] rounded-2xl border border-white/[0.08] shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              {exportStatus === 'idle' && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#4f8cff]/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#4f8cff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white">Export Video</h2>
                  <p className="text-xs text-white/50 mt-1">Render your video and download it.</p>
                </>
              )}
              {exportStatus === 'rendering' && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#4f8cff]/20 flex items-center justify-center animate-spin">
                    <svg className="w-8 h-8 text-[#4f8cff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white">Rendering...</h2>
                  <div className="mt-4 w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] rounded-full transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-white/30 font-mono mt-2">{Math.round(exportProgress)}%</p>
                </>
              )}
              {exportStatus === 'done' && exportUrl && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#51cf66]/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#51cf66]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white">Export Complete</h2>
                  <p className="text-xs text-white/50 mt-1">Your video is ready to download.</p>
                </>
              )}
              {exportStatus === 'error' && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white">Export Failed</h2>
                  <p className="text-xs text-white/50 mt-1">Could not render the video. Try again.</p>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {exportStatus === 'idle' && (
                <>
                  <button
                    onClick={() => { clickSound(); setShowExportModal(false) }}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-xs font-medium hover:bg-white/[0.10] transition-all"
                  >
                    Cancel
                  </button>
                  <button onClick={() => { clickSound(); startExport() }} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] text-white text-xs font-semibold hover:brightness-110 transition-all shadow-lg shadow-[#4f8cff]/20">
                    Start Render
                  </button>
                </>
              )}
              {exportStatus === 'rendering' && (
                <button
                  onClick={() => { clickSound(); setShowExportModal(false); setExportStatus('idle') }}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-xs font-medium hover:bg-white/[0.10] transition-all"
                >
                  Cancel
                </button>
              )}
              {(exportStatus === 'done' || exportStatus === 'error') && (
                <>
                  <button
                    onClick={() => { clickSound(); setShowExportModal(false); setExportStatus('idle'); setExportUrl(''); setExportProgress(0) }}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-xs font-medium hover:bg-white/[0.10] transition-all"
                  >
                    Close
                  </button>
                  {exportStatus === 'done' && exportUrl && (
                    <a
                      href={exportUrl}
                      download="vibe-studio-export.webm"
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] text-white text-xs font-semibold hover:brightness-110 transition-all shadow-lg shadow-[#4f8cff]/20 text-center block"
                    >
                      Download Video
                    </a>
                  )}
                  {exportStatus === 'error' && (
                    <button onClick={() => { clickSound(); startExport() }} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] text-white text-xs font-semibold hover:brightness-110 transition-all shadow-lg shadow-[#4f8cff]/20">
                      Retry
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showOnboarding && onboardingSteps[onboardingStep] && (() => {
        const step = onboardingSteps[onboardingStep]
        return (
          <>
            <div className="fixed inset-0 z-[500] bg-black/50" onClick={handleSkipOnboarding} />
            <div className="fixed z-[501] bottom-8 left-1/2 -translate-x-1/2 max-w-md bg-[#252540] border border-white/[0.08] rounded-2xl shadow-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f8cff] to-[#6c5ce7] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {onboardingStep + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/80 leading-relaxed">{step.text}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-1.5">
                      {onboardingSteps.map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === onboardingStep ? 'bg-[#4f8cff]' : 'bg-white/20'}`} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSkipOnboarding} className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 transition-all">
                        Skip
                      </button>
                      <button onClick={handleOnboardingNext} className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#4f8cff] to-[#6c5ce7] text-white text-xs font-semibold hover:brightness-110 transition-all">
                        {onboardingStep < onboardingSteps.length - 1 ? 'Next' : 'Done'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      <canvas ref={exportCanvasRef} className="hidden" width={1920} height={1080} />
    </div>
  )
}

function ToolbarButton({
  active,
  onClick,
  shortcut,
  label,
  children,
}: {
  active: boolean
  onClick?: () => void
  shortcut: string
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
        active
          ? 'bg-[#4f8cff]/20 text-[#4f8cff]'
          : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
      }`}
      title={`${label} (${shortcut})`}
    >
      {children}
      <span className="text-[9px] opacity-50">{shortcut}</span>
    </button>
  )
}
