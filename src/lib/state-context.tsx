'use client'

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { AdStudioState, Slide, BottomBanner, EndScreen, QrCode, Music, Voice, LayerOverlay, AudioFile } from './ad-studio-types'
import { createDefaultState } from './ad-studio-types'

type Action =
  | { type: 'SET_SLIDES'; payload: Slide[] }
  | { type: 'SET_CURRENT_SLIDE_INDEX'; payload: number }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_IS_PLAYING'; payload: boolean }
  | { type: 'SET_BOTTOM_BANNER'; payload: Partial<BottomBanner> }
  | { type: 'SET_END_SCREEN'; payload: Partial<EndScreen> }
  | { type: 'SET_QR_CODE'; payload: Partial<QrCode> }
  | { type: 'SET_MUSIC'; payload: Partial<Music> }
  | { type: 'SET_VOICE'; payload: Partial<Voice> }
  | { type: 'SET_AI_INPUT'; payload: { sourceType?: 'url' | 'maps'; query?: string } }
  | { type: 'SET_BUSINESS_NAME'; payload: string }
  | { type: 'SET_TAGLINE'; payload: string }
  | { type: 'SET_FEATURE_BULLETS'; payload: string[] }
  | { type: 'SET_HERO_IMAGES'; payload: string[] }
  | { type: 'SET_LOGO_URL'; payload: string }
  | { type: 'SET_ACCENT_COLOR'; payload: string }
  | { type: 'SET_IS_GENERATING'; payload: boolean }
  | { type: 'SET_BUSINESS_DATA'; payload: Partial<AdStudioState> }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_LAYERS'; payload: LayerOverlay[] }
  | { type: 'SET_SELECTED_LAYER_ID'; payload: string | null }
  | { type: 'ADD_LAYER'; payload: LayerOverlay }
  | { type: 'UPDATE_LAYER'; payload: { id: string; changes: Partial<LayerOverlay> } }
  | { type: 'REMOVE_LAYER'; payload: string }
  | { type: 'SET_MUSIC_AUDIO_FILE'; payload: AudioFile | null }
  | { type: 'SET_VOICE_AUDIO_FILE'; payload: AudioFile | null }
  | { type: 'RESET' }

function reducer(state: AdStudioState, action: Action): AdStudioState {
  switch (action.type) {
    case 'SET_SLIDES':
      return { ...state, slides: action.payload }
    case 'SET_CURRENT_SLIDE_INDEX':
      return { ...state, currentSlideIndex: action.payload }
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload }
    case 'SET_IS_PLAYING':
      return { ...state, isPlaying: action.payload }
    case 'SET_BOTTOM_BANNER':
      return { ...state, bottomBanner: { ...state.bottomBanner, ...action.payload } }
    case 'SET_END_SCREEN':
      return { ...state, endScreen: { ...state.endScreen, ...action.payload } }
    case 'SET_QR_CODE':
      return { ...state, qrCode: { ...state.qrCode, ...action.payload } }
    case 'SET_MUSIC':
      return { ...state, music: { ...state.music, ...action.payload } }
    case 'SET_VOICE':
      return { ...state, voice: { ...state.voice, ...action.payload } }
    case 'SET_AI_INPUT':
      return { ...state, aiInput: { ...state.aiInput, ...action.payload } }
    case 'SET_BUSINESS_NAME':
      return { ...state, businessName: action.payload }
    case 'SET_TAGLINE':
      return { ...state, tagline: action.payload }
    case 'SET_FEATURE_BULLETS':
      return { ...state, featureBullets: action.payload }
    case 'SET_HERO_IMAGES':
      return { ...state, heroImages: action.payload }
    case 'SET_LOGO_URL':
      return { ...state, logoUrl: action.payload }
    case 'SET_ACCENT_COLOR':
      return { ...state, accentColor: action.payload }
    case 'SET_IS_GENERATING':
      return { ...state, isGenerating: action.payload }
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload }
    case 'SET_LAYERS':
      return { ...state, layers: action.payload }
    case 'SET_SELECTED_LAYER_ID':
      return { ...state, selectedLayerId: action.payload }
    case 'ADD_LAYER':
      return { ...state, layers: [...state.layers, action.payload] }
    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === action.payload.id ? { ...l, ...action.payload.changes } : l
        ),
      }
    case 'REMOVE_LAYER':
      return {
        ...state,
        layers: state.layers.filter(l => l.id !== action.payload),
        selectedLayerId: state.selectedLayerId === action.payload ? null : state.selectedLayerId,
      }
    case 'SET_MUSIC_AUDIO_FILE':
      return { ...state, music: { ...state.music, audioFile: action.payload } }
    case 'SET_VOICE_AUDIO_FILE':
      return { ...state, voice: { ...state.voice, audioFile: action.payload } }
    case 'SET_BUSINESS_DATA':
      return { ...state, ...action.payload }
    case 'RESET':
      return createDefaultState()
    default:
      return state
  }
}

interface StateContextValue {
  state: AdStudioState
  dispatch: React.Dispatch<Action>
  updateSlides: (slides: Slide[]) => void
  updateBottomBanner: (data: Partial<BottomBanner>) => void
  updateEndScreen: (data: Partial<EndScreen>) => void
  updateQrCode: (data: Partial<QrCode>) => void
  updateMusic: (data: Partial<Music>) => void
  updateVoice: (data: Partial<Voice>) => void
  updateLayers: (layers: LayerOverlay[]) => void
  addLayer: (layer: LayerOverlay) => void
  updateLayer: (id: string, changes: Partial<LayerOverlay>) => void
  removeLayer: (id: string) => void
  setZoom: (zoom: number) => void
  setMusicAudioFile: (file: AudioFile | null) => void
  setVoiceAudioFile: (file: AudioFile | null) => void
}

const StateContext = createContext<StateContextValue | null>(null)

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createDefaultState)

  const updateSlides = useCallback((slides: Slide[]) => dispatch({ type: 'SET_SLIDES', payload: slides }), [])
  const updateBottomBanner = useCallback((data: Partial<BottomBanner>) => dispatch({ type: 'SET_BOTTOM_BANNER', payload: data }), [])
  const updateEndScreen = useCallback((data: Partial<EndScreen>) => dispatch({ type: 'SET_END_SCREEN', payload: data }), [])
  const updateQrCode = useCallback((data: Partial<QrCode>) => dispatch({ type: 'SET_QR_CODE', payload: data }), [])
  const updateMusic = useCallback((data: Partial<Music>) => dispatch({ type: 'SET_MUSIC', payload: data }), [])
  const updateVoice = useCallback((data: Partial<Voice>) => dispatch({ type: 'SET_VOICE', payload: data }), [])
  const updateLayers = useCallback((layers: LayerOverlay[]) => dispatch({ type: 'SET_LAYERS', payload: layers }), [])
  const addLayer = useCallback((layer: LayerOverlay) => dispatch({ type: 'ADD_LAYER', payload: layer }), [])
  const updateLayer = useCallback((id: string, changes: Partial<LayerOverlay>) => dispatch({ type: 'UPDATE_LAYER', payload: { id, changes } }), [])
  const removeLayer = useCallback((id: string) => dispatch({ type: 'REMOVE_LAYER', payload: id }), [])
  const setZoom = useCallback((zoom: number) => dispatch({ type: 'SET_ZOOM', payload: zoom }), [])
  const setMusicAudioFile = useCallback((file: AudioFile | null) => dispatch({ type: 'SET_MUSIC_AUDIO_FILE', payload: file }), [])
  const setVoiceAudioFile = useCallback((file: AudioFile | null) => dispatch({ type: 'SET_VOICE_AUDIO_FILE', payload: file }), [])

  return (
    <StateContext.Provider value={{ state, dispatch, updateSlides, updateBottomBanner, updateEndScreen, updateQrCode, updateMusic, updateVoice, updateLayers, addLayer, updateLayer, removeLayer, setZoom, setMusicAudioFile, setVoiceAudioFile }}>
      {children}
    </StateContext.Provider>
  )
}

export function useStudioState() {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useStudioState must be used within StateProvider')
  return ctx
}
