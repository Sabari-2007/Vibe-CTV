'use client'

export class AudioGenerator {
  private ctx: AudioContext | null = null
  private nodes: OscillatorNode[] = []
  private masterGain: GainNode | null = null
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

    this.masterGain = ctx.createGain()
    this.masterGain.gain.value = 0.15
    this.masterGain.connect(ctx.destination)

    const patterns = this.getPatterns(genre)
    const bpm = patterns.bpm
    const beatDuration = 60 / bpm
    const now = ctx.currentTime
    const totalDuration = 30
    const totalBeats = Math.ceil(totalDuration / (beatDuration * patterns.noteDivision))

    for (let i = 0; i < totalBeats; i++) {
      const note = patterns.notes[i % patterns.notes.length]
      const startTime = now + i * beatDuration * patterns.noteDivision
      const noteLength = beatDuration * patterns.noteDivision * 0.8
      const fadeOut = Math.min(0.05, noteLength * 0.3)

      const osc = ctx.createOscillator()
      const noteGain = ctx.createGain()

      osc.type = note.waveform as OscillatorType
      osc.frequency.value = note.freq

      noteGain.gain.setValueAtTime(0, startTime)
      noteGain.gain.linearRampToValueAtTime(note.volume, startTime + 0.01)
      noteGain.gain.linearRampToValueAtTime(note.volume, startTime + noteLength - fadeOut)
      noteGain.gain.linearRampToValueAtTime(0, startTime + noteLength)

      osc.connect(noteGain)
      noteGain.connect(this.masterGain)

      osc.start(startTime)
      osc.stop(startTime + noteLength)

      this.nodes.push(osc)
    }

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
          { freq: 110, waveform: 'sawtooth', volume: 0.15 },
          { freq: 220, waveform: 'square', volume: 0.1 },
          { freq: 146.83, waveform: 'sawtooth', volume: 0.15 },
          { freq: 110, waveform: 'square', volume: 0.1 },
          { freq: 164.81, waveform: 'sawtooth', volume: 0.15 },
          { freq: 110, waveform: 'square', volume: 0.1 },
          { freq: 196, waveform: 'sawtooth', volume: 0.15 },
          { freq: 110, waveform: 'square', volume: 0.1 },
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
          { freq: 440, waveform: 'square', volume: 0.15 },
          { freq: 55, waveform: 'sawtooth', volume: 0.2 },
          { freq: 440, waveform: 'square', volume: 0.15 },
          { freq: 55, waveform: 'sawtooth', volume: 0.2 },
          { freq: 554.37, waveform: 'square', volume: 0.15 },
          { freq: 55, waveform: 'sawtooth', volume: 0.2 },
          { freq: 554.37, waveform: 'square', volume: 0.15 },
          { freq: 55, waveform: 'sawtooth', volume: 0.2 },
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
