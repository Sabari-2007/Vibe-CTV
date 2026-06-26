'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const ITEMS = [
  { src: '/images/mosaic/Action%20Movies.avif', label: 'ACTION MOVIES' },
  { src: '/images/mosaic/Anime.avif', label: 'ANIME' },
  { src: '/images/mosaic/Baseball.avif', label: 'BASEBALL' },
  { src: '/images/mosaic/Basketball.avif', label: 'BASKETBALL' },
  { src: '/images/mosaic/Business.avif', label: 'BUSINESS' },
  { src: '/images/mosaic/Comedy.avif', label: 'COMEDY' },
  { src: '/images/mosaic/Criminal%20Justice.avif', label: 'CRIMINAL JUSTICE' },
  { src: '/images/mosaic/Debates.avif', label: 'DEBATES' },
  { src: '/images/mosaic/Documentaries.avif', label: 'DOCUMENTARIES' },
  { src: '/images/mosaic/Fashon%20and%20style.avif', label: 'FASHION AND STYLE' },
  { src: '/images/mosaic/Food.avif', label: 'FOOD' },
  { src: '/images/mosaic/Football.avif', label: 'FOOTBALL' },
  { src: '/images/mosaic/Health%20and%20Wellness.avif', label: 'HEALTH AND WELLNESS' },
  { src: '/images/mosaic/Hispanic.avif', label: 'HISPANIC' },
  { src: '/images/mosaic/Home%20Improvement.avif', label: 'HOME IMPROVEMENT' },
  { src: '/images/mosaic/Live%20Sport.avif', label: 'LIVE SPORT' },
  { src: '/images/mosaic/Motorsports.avif', label: 'MOTORSPORTS' },
  { src: '/images/mosaic/Movies.avif', label: 'MOVIES' },
  { src: '/images/mosaic/Music.avif', label: 'MUSIC' },
  { src: '/images/mosaic/News.avif', label: 'NEWS' },
  { src: '/images/mosaic/Reality%20show.avif', label: 'REALITY SHOW' },
  { src: '/images/mosaic/Roance.avif', label: 'ROMANCE' },
  { src: '/images/mosaic/Sci-fi.avif', label: 'SCI-FI' },
  { src: '/images/mosaic/Thrillers.avif', label: 'THRILLERS' },
  { src: '/images/mosaic/Travel.avif', label: 'TRAVEL' },
  { src: '/images/mosaic/Tv%20SHOW.avif', label: 'TV SHOW' },
]

const DURATION = 60

function useScrollKeyframes() {
  useEffect(() => {
    if (document.getElementById('v-mosaic-keys')) return
    const style = document.createElement('style')
    style.id = 'v-mosaic-keys'
    style.textContent = `
      @keyframes v-scroll-left {
        from { transform: translateX(0%); }
        to { transform: translateX(-50%); }
      }
      @keyframes v-scroll-right {
        from { transform: translateX(-50%); }
        to { transform: translateX(0%); }
      }
    `
    document.head.appendChild(style)
  }, [])
}

function ImageCard({ src, onHoverChange }: { src: string; onHoverChange: (h: boolean) => void }) {
  const [localHover, setLocalHover] = useState(false)

  return (
    <motion.div
      className="relative rounded-lg overflow-hidden aspect-video w-[140px] md:w-[200px] flex-shrink-0 bg-[#F1F5F9] cursor-pointer"
      onMouseEnter={() => { setLocalHover(true); onHoverChange(true) }}
      onMouseLeave={() => { setLocalHover(false); onHoverChange(false) }}
      animate={localHover ? { scale: 1.05 } : { scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={src}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
          localHover ? 'scale-110 brightness-110' : 'scale-100 brightness-100'
        }`}
      />
      <div className={`absolute inset-0 transition-all duration-300 ${
        localHover
          ? 'bg-gradient-to-t from-black/50 via-black/5 to-transparent'
          : 'bg-gradient-to-t from-black/70 via-black/10 to-transparent'
      }`} />
      {localHover && (
        <div className="absolute inset-0 ring-1 ring-[#2563EB] rounded-lg transition-all duration-300" />
      )}
    </motion.div>
  )
}

function ScrollRow({ items, reverse }: { items: typeof ITEMS; reverse?: boolean }) {
  const hoverCount = useRef(0)
  const [paused, setPaused] = useState(false)
  const doubled = [...items, ...items]
  const name = reverse ? 'v-scroll-right' : 'v-scroll-left'

  const handleHover = (entering: boolean) => {
    if (entering) {
      hoverCount.current += 1
    } else {
      hoverCount.current -= 1
    }
    setPaused(hoverCount.current > 0)
  }

  return (
    <div className="relative">
      <div
        className="flex gap-3 will-change-transform"
        style={{
          animation: `${name} ${DURATION}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {doubled.map((item, i) => (
          <ImageCard key={`${item.label}-${i}`} src={item.src} onHoverChange={handleHover} />
        ))}
      </div>
    </div>
  )
}

function buildRows() {
  const arr = [...ITEMS]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const a: typeof ITEMS = []
  const b: typeof ITEMS = []
  const c: typeof ITEMS = []
  arr.forEach((item, i) => {
    if (i % 3 === 0) a.push(item)
    else if (i % 3 === 1) b.push(item)
    else c.push(item)
  })
  return [a, b, c]
}

let cachedRows: typeof ITEMS[] | null = null

export function VideoMosaic() {
  useScrollKeyframes()
  if (!cachedRows) cachedRows = buildRows()

  return (
    <section className="relative py-16 bg-white overflow-hidden">
      <div className="space-y-4">
        <ScrollRow items={cachedRows[0]} />
        <ScrollRow items={cachedRows[1]} reverse />
        <ScrollRow items={cachedRows[2]} />
      </div>

      <div className="absolute inset-y-0 left-0 w-full md:w-3/5 bg-gradient-to-r from-white via-white/95 to-transparent z-10 pointer-events-none" />

      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center">
          <div className="max-w-lg">
            <h1 className="text-[2rem] md:text-[2.8rem] lg:text-[3.2rem] font-bold text-[#0F172A] leading-[1.1] tracking-tight">
              Put your brand next to content your customers love
            </h1>
            <Link href="/campaign/new">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="mt-6 px-8 py-4 bg-[#0F172A] text-white rounded-xl font-semibold text-base hover:shadow-xl transition-shadow pointer-events-auto"
              >
                Start a campaign
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
