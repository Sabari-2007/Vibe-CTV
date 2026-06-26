'use client'

import { useCallback, useRef, useEffect } from 'react'

const SOUND_URL = '/click-sound.mp3'

let sharedAudio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio(SOUND_URL)
    sharedAudio.volume = 0.3
  }
  return sharedAudio
}

export function useClickSound() {
  const play = useCallback(() => {
    try {
      const audio = getAudio()
      audio.currentTime = 0
      audio.play().catch(() => {})
    } catch {}
  }, [])

  return play
}

export function clickSound() {
  try {
    const audio = getAudio()
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch {}
}
