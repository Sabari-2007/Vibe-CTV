export interface Slide {
  id: string
  imageUrl: string
  startTime: number
  endTime: number
  label: string
}

export interface BottomBanner {
  logoUrl: string
  companyName: string
  address: string
  phone: string
  websiteUrl: string
}

export interface EndScreen {
  logoUrl: string
  companyName: string
  address: string
  phone: string
  websiteUrl: string
  accentColor: string
}

export interface QrCode {
  enabled: boolean
}

export interface Music {
  enabled: boolean
  genre: string
}

export interface AudioFile {
  dataUrl: string
  name: string
  waveform: number[]
}

export interface Voice {
  enabled: boolean
  script: string
  voiceProfile: string
  audioFile: AudioFile | null
}

export interface Music {
  enabled: boolean
  genre: string
  audioFile: AudioFile | null
}

export interface LayerOverlay {
  id: string
  type: 'text' | 'image'
  content: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  rotation: number
  fontSize?: number
  color?: string
}

export interface AiInput {
  sourceType: 'url' | 'maps'
  query: string
}

export interface AdStudioState {
  slides: Slide[]
  bottomBanner: BottomBanner
  endScreen: EndScreen
  qrCode: QrCode
  music: Music
  voice: Voice
  aiInput: AiInput
  businessName: string
  tagline: string
  featureBullets: string[]
  heroImages: string[]
  logoUrl: string
  accentColor: string
  currentSlideIndex: number
  currentTime: number
  isPlaying: boolean
  isGenerating: boolean
  zoom: number
  layers: LayerOverlay[]
  selectedLayerId: string | null
}

export function createDefaultState(): AdStudioState {
  return {
    slides: [],
    bottomBanner: {
      logoUrl: '',
      companyName: '',
      address: '',
      phone: '',
      websiteUrl: '',
    },
    endScreen: {
      logoUrl: '',
      companyName: '',
      address: '',
      phone: '',
      websiteUrl: '',
      accentColor: '#22548A',
    },
    qrCode: { enabled: false },
    music: { enabled: false, genre: 'Corporate', audioFile: null },
    voice: { enabled: false, script: '', voiceProfile: 'Male, American, Deep, Middle-aged', audioFile: null },
    aiInput: { sourceType: 'url', query: '' },
    businessName: '',
    tagline: '',
    featureBullets: [],
    heroImages: [],
    logoUrl: '',
    accentColor: '#22548A',
    currentSlideIndex: 0,
    currentTime: 0,
    isPlaying: false,
    isGenerating: false,
    zoom: 1,
    layers: [],
    selectedLayerId: null,
  }
}

export const MUSIC_GENRES = ['Corporate', 'Rock', 'Upbeat', 'Cinematic', 'Acoustic', 'Electronic', 'Ambient']

export const VOICE_PROFILES_EXTENDED = [
  'Male, American, Deep, Middle-aged',
  'Female, British, Warm, Young-adult',
  'Male, British, Authoritative, Middle-aged',
  'Female, American, Energetic, Young-adult',
  'Male, American, Friendly, Middle-aged',
  'Female, British, Calm, Mature',
]

export const FREE_STOCK_SITES = [
  { name: 'Pexels', url: 'https://pexels.com' },
  { name: 'Unsplash', url: 'https://unsplash.com' },
  { name: 'Pixabay', url: 'https://pixabay.com' },
  { name: 'Life of Pix', url: 'https://lifeofpix.com' },
  { name: 'Videvo', url: 'https://videvo.net' },
]

export const PAID_STOCK_SITES = [
  { name: 'Shutterstock', url: 'https://shutterstock.com' },
  { name: 'iStock', url: 'https://istockphoto.com' },
  { name: 'Adobe Stock', url: 'https://stock.adobe.com' },
  { name: 'Getty Images', url: 'https://gettyimages.com' },
  { name: '123RF', url: 'https://123rf.com' },
]
