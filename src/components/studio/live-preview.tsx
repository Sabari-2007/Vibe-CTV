'use client'

import { useState, useEffect, useRef } from 'react'
import { useStudioState } from '@/lib/state-context'
import { generateQRDataUrl } from '@/lib/qrcode'
import type { Slide, LayerOverlay } from '@/lib/ad-studio-types'

interface LivePreviewProps {
  activeSlide: Slide | undefined
  totalDuration: number
}

export function LivePreview({ activeSlide, totalDuration }: LivePreviewProps) {
  const { state, dispatch } = useStudioState()
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [currentPreviewText, setCurrentPreviewText] = useState('')
  const [showTextEdit, setShowTextEdit] = useState(false)
  const [imgError, setImgError] = useState(false)
  const textEditRef = useRef<HTMLDivElement>(null)

  const progress = totalDuration > 0 ? (state.currentTime / totalDuration) * 100 : 0
  const showEndScreen = state.currentTime >= totalDuration - 4 && totalDuration > 0

  useEffect(() => {
    if (state.qrCode.enabled && state.bottomBanner.websiteUrl) {
      setQrDataUrl(generateQRDataUrl(state.bottomBanner.websiteUrl, 120))
    } else {
      setQrDataUrl('')
    }
  }, [state.qrCode.enabled, state.bottomBanner.websiteUrl])

  useEffect(() => {
    setImgError(false)
    if (activeSlide) {
      setCurrentPreviewText(state.businessName || state.tagline || 'Your Brand')
    }
  }, [activeSlide, state.businessName, state.tagline])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (textEditRef.current && !textEditRef.current.contains(e.target as Node)) {
        setShowTextEdit(false)
      }
    }
    if (showTextEdit) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTextEdit])

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 group flex-1">
      {showEndScreen ? (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: state.endScreen.accentColor }}>
          <div className="text-center">
            {state.endScreen.logoUrl && (
              <img src={state.endScreen.logoUrl} alt="Logo" className="h-14 mx-auto mb-4 opacity-90" />
            )}
            <h3 className="text-white text-3xl font-bold mb-2">{state.endScreen.companyName || state.businessName}</h3>
            <p className="text-white/70 text-base mb-4">{state.endScreen.websiteUrl}</p>
            <div className="flex items-center justify-center gap-3 text-sm text-white/50">
              {state.endScreen.address && <span>{state.endScreen.address}</span>}
              {state.endScreen.phone && <span>{state.endScreen.phone}</span>}
            </div>
          </div>
        </div>
      ) : activeSlide ? (
        <>
          {imgError ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#0d0d14]">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-white/30 text-xs">Failed to load image</p>
              </div>
            </div>
          ) : (
            <img
              src={activeSlide.imageUrl}
              alt={activeSlide.label}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {state.logoUrl && (
            <div className="absolute top-3 left-3 w-11 h-11 rounded-xl bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
              <img src={state.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            </div>
          )}

          {state.qrCode.enabled && qrDataUrl && (
            <div className="absolute top-3 right-3 w-14 h-14 rounded-xl bg-[#1a1a2e] shadow-lg flex items-center justify-center border border-white/20">
              <img src={qrDataUrl} alt="QR Code" className="w-12 h-12" />
            </div>
          )}

          <div className="absolute bottom-16 left-0 right-0 p-6" onClick={() => setShowTextEdit(!showTextEdit)}>
            <div className="relative inline-block">
              <h2 className="text-white text-2xl md:text-3xl font-bold mb-1 drop-shadow-lg cursor-pointer hover:underline decoration-accent/50 decoration-2 underline-offset-4">
                {state.businessName || activeSlide.label}
              </h2>
              {showTextEdit && (
                <div ref={textEditRef} className="absolute bottom-full left-0 mb-2 bg-[#1a1a25] border border-white/10 rounded-xl p-3 shadow-2xl w-64 z-20">
                  <p className="text-[10px] text-white/40 mb-1.5">Edit headline</p>
                  <input
                    type="text"
                    value={state.businessName}
                    onChange={(e) => dispatch({ type: 'SET_BUSINESS_NAME', payload: e.target.value })}
                    className="w-full px-2 py-1.5 bg-[#0d0d14] border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent/50"
                    autoFocus
                  />
                </div>
              )}
            </div>
            {state.tagline && <p className="text-white/80 text-sm md:text-base mb-3 drop-shadow">{state.tagline}</p>}
            {state.featureBullets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {state.featureBullets.map((bullet, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white/90 text-xs border border-white/10 shadow-sm">
                    {bullet}
                  </span>
                ))}
              </div>
            )}
          </div>

          {state.layers.length > 0 && state.layers.map((layer: LayerOverlay) => (
            <div
              key={layer.id}
              className="absolute pointer-events-none"
              style={{
                left: `${layer.x}px`,
                top: `${layer.y}px`,
                width: `${layer.width}px`,
                height: `${layer.height}px`,
                opacity: layer.opacity,
                transform: `rotate(${layer.rotation}deg)`,
                zIndex: 10,
              }}
            >
              {layer.type === 'text' ? (
                <span
                  style={{
                    fontSize: `${layer.fontSize || 32}px`,
                    color: layer.color || '#ffffff',
                    fontWeight: 700,
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.2,
                  }}
                >
                  {layer.content}
                </span>
              ) : (
                <img src={layer.content} alt="" className="w-full h-full object-contain" />
              )}
            </div>
          ))}

          {state.bottomBanner.companyName && (
            <div className="absolute bottom-0 left-0 right-0 h-11 bg-[#1a1a2e]/90 backdrop-blur-md flex items-center px-4 gap-3 border-t border-white/[0.06]">
              {state.bottomBanner.logoUrl && (
                <img src={state.bottomBanner.logoUrl} alt="" className="w-6 h-6 object-contain rounded" />
              )}
              <span className="text-white/90 text-xs font-semibold">{state.bottomBanner.companyName}</span>
              <span className="text-white/40 text-[10px] ml-auto truncate">{state.bottomBanner.websiteUrl}</span>
            </div>
          )}

          {state.isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                <div className="flex items-end gap-0.5 h-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-white rounded-full animate-pulse"
                      style={{
                        height: `${[10, 22, 12, 18][i - 1]}px`,
                        animationDelay: `${i * 0.12}s`,
                        opacity: 0.9,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="absolute top-3 right-16 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-white/60 font-mono border border-white/10">
            {activeSlide.label}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d14]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">No slides to preview</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-10">
        <div className="h-full bg-accent transition-all duration-100 shadow-sm shadow-accent/50" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
