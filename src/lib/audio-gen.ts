'use client'

export class AudioGenerator {
  private ctx: AudioContext | null = null
  private nodes: OscillatorNode[] = []
  private gain: GainNode | null = null
  private isPlaying = false

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    return this.ctx
  }

  getIsPlaying() { return this.isPlaying }

  async playGenre(genre: string): Promise<void> {
    this.stop()

    const ctx = this.getContext()
    if (ctx.state === 'suspended') await ctx.resume()

    this.gain = ctx.createGain()
    this.gain.gain.value = 0.15
    this.gain.connect(ctx.destination)

    const patterns = this.getPatterns(genre)
    const bpm = patterns.bpm
    const beatDuration = 60 / bpm
    const now = ctx.currentTime

    patterns.notes.forEach((note, i) => {
      const startTime = now + i * beatDuration * patterns.noteDivision
      const osc = ctx.createOscillator()
      const noteGain = ctx.createGain()

      osc.type = note.waveform as OscillatorType
      osc.frequency.value = note.freq
      noteGain.gain.setValueAtTime(0, startTime)
      noteGain.gain.linearRampToValueAtTime(note.volume, startTime + 0.02)
      noteGain.gain.linearRampToValueAtTime(0, startTime + beatDuration * patterns.noteDivision * 0.9)

      osc.connect(noteGain)
      noteGain.connect(this.gain!)

      osc.start(startTime)
      osc.stop(startTime + beatDuration * patterns.noteDivision)

      this.nodes.push(osc)
    })

    this.isPlaying = true
  }

  stop(): void {
    this.nodes.forEach(n => {
      try { n.stop() } catch {}
    })
    this.nodes = []
    this.isPlaying = false
  }

  private getPatterns(genre: string) {
    const patterns: Record<string, { bpm: number; noteDivision: number; notes: { freq: number; waveform: string; volume: number }[] }> = {
      Corporate: {
        bpm: 110,
        noteDivision: 1,
        notes: [
          { freq: 261.63, waveform: 'sine', volume: 0.3 },
          { freq: 329.63, waveform: 'sine', volume: 0.3 },
          { freq: 293.66, waveform: 'sine', volume: 0.3 },
          { freq: 349.23, waveform: 'sine', volume: 0.3 },
          { freq: 261.63, waveform: 'triangle', volume: 0.2 },
          { freq: 392.00, waveform: 'sine', volume: 0.3 },
          { freq: 349.23, waveform: 'sine', volume: 0.3 },
          { freq: 293.66, waveform: 'sine', volume: 0.3 },
        ],
      },
      Rock: {
        bpm: 140,
        noteDivision: 0.5,
        notes: [
          { freq: 110, waveform: 'sawtooth', volume: 0.2 },
          { freq: 220, waveform: 'square', volume: 0.15 },
          { freq: 146.83, waveform: 'sawtooth', volume: 0.2 },
          { freq: 110, waveform: 'square', volume: 0.15 },
          { freq: 164.81, waveform: 'sawtooth', volume: 0.2 },
          { freq: 110, waveform: 'square', volume: 0.15 },
          { freq: 196, waveform: 'sawtooth', volume: 0.2 },
          { freq: 110, waveform: 'square', volume: 0.15 },
        ],
      },
      Upbeat: {
        bpm: 128,
        noteDivision: 0.5,
        notes: [
          { freq: 440, waveform: 'sine', volume: 0.25 },
          { freq: 554.37, waveform: 'sine', volume: 0.25 },
          { freq: 659.25, waveform: 'triangle', volume: 0.2 },
          { freq: 554.37, waveform: 'sine', volume: 0.25 },
          { freq: 440, waveform: 'triangle', volume: 0.2 },
          { freq: 554.37, waveform: 'sine', volume: 0.25 },
          { freq: 783.99, waveform: 'sine', volume: 0.25 },
          { freq: 659.25, waveform: 'triangle', volume: 0.2 },
        ],
      },
      Cinematic: {
        bpm: 80,
        noteDivision: 2,
        notes: [
          { freq: 130.81, waveform: 'sine', volume: 0.4 },
          { freq: 196, waveform: 'sine', volume: 0.3 },
          { freq: 261.63, waveform: 'sine', volume: 0.3 },
          { freq: 196, waveform: 'triangle', volume: 0.25 },
          { freq: 164.81, waveform: 'sine', volume: 0.35 },
          { freq: 220, waveform: 'sine', volume: 0.3 },
          { freq: 293.66, waveform: 'sine', volume: 0.3 },
          { freq: 220, waveform: 'triangle', volume: 0.25 },
        ],
      },
      Acoustic: {
        bpm: 90,
        noteDivision: 1,
        notes: [
          { freq: 392, waveform: 'sine', volume: 0.25 },
          { freq: 349.23, waveform: 'sine', volume: 0.2 },
          { freq: 329.63, waveform: 'sine', volume: 0.25 },
          { freq: 293.66, waveform: 'sine', volume: 0.2 },
          { freq: 261.63, waveform: 'sine', volume: 0.25 },
          { freq: 293.66, waveform: 'sine', volume: 0.2 },
          { freq: 329.63, waveform: 'sine', volume: 0.25 },
          { freq: 349.23, waveform: 'sine', volume: 0.2 },
        ],
      },
      Electronic: {
        bpm: 130,
        noteDivision: 0.25,
        notes: [
          { freq: 440, waveform: 'square', volume: 0.2 },
          { freq: 55, waveform: 'sawtooth', volume: 0.3 },
          { freq: 440, waveform: 'square', volume: 0.2 },
          { freq: 55, waveform: 'sawtooth', volume: 0.3 },
          { freq: 554.37, waveform: 'square', volume: 0.2 },
          { freq: 55, waveform: 'sawtooth', volume: 0.3 },
          { freq: 554.37, waveform: 'square', volume: 0.2 },
          { freq: 55, waveform: 'sawtooth', volume: 0.3 },
        ],
      },
      Ambient: {
        bpm: 60,
        noteDivision: 4,
        notes: [
          { freq: 220, waveform: 'sine', volume: 0.2 },
          { freq: 220, waveform: 'sine', volume: 0.15 },
          { freq: 196, waveform: 'sine', volume: 0.2 },
          { freq: 196, waveform: 'sine', volume: 0.15 },
          { freq: 174.61, waveform: 'sine', volume: 0.2 },
          { freq: 174.61, waveform: 'sine', volume: 0.15 },
          { freq: 164.81, waveform: 'sine', volume: 0.2 },
          { freq: 164.81, waveform: 'sine', volume: 0.15 },
        ],
      },
    }

    return patterns[genre] || patterns.Corporate
  }
}

export const audioGen = new AudioGenerator()
