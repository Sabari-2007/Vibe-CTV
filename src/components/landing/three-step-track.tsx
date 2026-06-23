'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const LOCATIONS = ['Austin, TX', 'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Miami, FL']
const GENRES = ['Sports', 'News', 'Movies', 'Entertainment', 'Comedy', 'Drama']

export function ThreeStepTrack() {
  const [step, setStep] = useState(0)
  const [dailyBudget, setDailyBudget] = useState('')
  const [budgetError, setBudgetError] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [live, setLive] = useState(false)

  const handleBudgetChange = (v: string) => {
    setDailyBudget(v)
    const n = Number(v)
    if (v && (isNaN(n) || n < 50)) {
      setBudgetError('Minimum daily budget is $50')
    } else {
      setBudgetError('')
    }
  }

  const toggleLocation = (l: string) => {
    setSelectedLocations((p) => p.includes(l) ? p.filter((x) => x !== l) : [...p, l])
  }

  const toggleGenre = (g: string) => {
    setSelectedGenres((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g])
  }

  const goNext = () => {
    if (step === 0) {
      const n = Number(dailyBudget)
      if (!dailyBudget || isNaN(n) || n < 50) {
        setBudgetError('Minimum daily budget is $50')
        return
      }
    }
    if (step < 2) setStep((s) => s + 1)
  }

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Launch in <span className="text-gradient">three steps</span>
          </h2>
          <p className="text-[#8E9AA8] max-w-xl mx-auto">
            From concept to live campaign in minutes. No complex setup required.
          </p>
        </motion.div>

        <div className="flex items-center gap-3 mb-12 justify-center">
          {['Create Campaign', 'Set Targeting', 'Go Live'].map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  i === step
                    ? 'bg-accent text-[#08090D] neon-glow'
                    : i < step
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'bg-white/5 text-[#8E9AA8] border border-white/10'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i <= step ? 'bg-white/20' : 'bg-white/5'
                }`}>
                  {i + 1}
                </span>
                {label}
              </button>
              {i < 2 && (
                <div className={`w-8 h-px ${i < step ? 'bg-accent/50' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-8 max-w-2xl mx-auto"
        >
          {step === 0 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">Set Your Budget</h3>
              <p className="text-sm text-[#8E9AA8]">Define your daily spending limit to control campaign costs.</p>
              <div>
                <label className="block text-xs font-medium text-[#8E9AA8] mb-1.5">Daily Budget</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9AA8] text-sm">$</span>
                  <input
                    type="number"
                    value={dailyBudget}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    placeholder="50"
                    min={50}
                    className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#8E9AA8]/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                </div>
                {budgetError && <p className="text-xs text-red-400 mt-1.5">{budgetError}</p>}
                {dailyBudget && !budgetError && (
                  <p className="text-xs text-accent mt-1.5">
                    Estimated reach: ~{Number(dailyBudget) * 45} impressions/day
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Target Your Audience</h3>
              <div>
                <label className="block text-xs font-medium text-[#8E9AA8] mb-2">Locations</label>
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map((l) => (
                    <button
                      key={l}
                      onClick={() => toggleLocation(l)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                        selectedLocations.includes(l)
                          ? 'bg-accent/10 border-accent/30 text-accent'
                          : 'bg-white/5 border-white/10 text-[#8E9AA8] hover:border-white/20'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8E9AA8] mb-2">Content Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                        selectedGenres.includes(g)
                          ? 'bg-accent/10 border-accent/30 text-accent'
                          : 'bg-white/5 border-white/10 text-[#8E9AA8] hover:border-white/20'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto">
                <svg className={`w-8 h-8 text-accent transition-all duration-500 ${live ? 'scale-110' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Ready to Go Live</h3>
              <p className="text-sm text-[#8E9AA8] max-w-sm mx-auto">
                Your campaign is configured and ready to launch across premium CTV networks.
              </p>
              <button
                onClick={() => setLive(!live)}
                className={`relative inline-flex items-center gap-3 px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-500 ${
                  live
                    ? 'bg-accent text-[#08090D] neon-glow'
                    : 'bg-white/5 text-[#8E9AA8] border border-white/10 hover:border-accent/30'
                }`}
              >
                <span className={`w-3 h-3 rounded-full transition-all duration-500 ${live ? 'bg-[#08090D] animate-pulse' : 'bg-[#8E9AA8]'}`} />
                {live ? 'Live — Campaign Active' : 'Click to Launch Campaign'}
              </button>
              {live && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 text-xs text-accent"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping-slow" />
                  Campaign is now live on all selected networks
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        <div className="flex justify-center mt-8">
          {step < 2 ? (
            <button
              onClick={goNext}
              className="px-8 py-3 rounded-xl bg-accent text-[#08090D] font-semibold text-sm hover:bg-accent/90 transition-all neon-glow"
            >
              Continue to {step === 0 ? 'Targeting' : 'Go Live'}
            </button>
          ) : (
            <a
              href="/campaign/new"
              className="px-8 py-3 rounded-xl bg-accent text-[#08090D] font-semibold text-sm hover:bg-accent/90 transition-all neon-glow"
            >
              Create Full Campaign
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
