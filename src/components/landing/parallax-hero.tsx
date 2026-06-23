'use client'

import { useScroll, useTransform, motion } from 'framer-motion'
import Link from 'next/link'

export function ParallaxHero() {
  const { scrollY } = useScroll()
  const bgY = useTransform(scrollY, [0, 1000], [0, 250])
  const midY = useTransform(scrollY, [0, 1000], [0, 120])
  const opacity = useTransform(scrollY, [0, 600], [1, 0])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 grid-bg gradient-mask"
      />

      <motion.div
        style={{ y: midY }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="relative w-[600px] h-[600px]">
          <div className="absolute inset-0 rounded-full bg-accent/5 blur-[100px] animate-pulse-glow" />
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-violet/20 blur-[60px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-accent/10 blur-[80px] animate-drift" />
        </div>
      </motion.div>

      <motion.div style={{ opacity }} className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-accent mb-8 border border-accent/20">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            AI-Powered CTV Advertising Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            CTV Advertising{' '}
            <span className="text-gradient">That Works</span>
          </h1>

          <p className="text-lg md:text-xl text-slate max-w-2xl mx-auto mb-10 leading-relaxed">
            Programmatic buying for the connected TV era. Launch campaigns across
            premium streaming channels with real-time analytics and smart targeting.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/campaign/new"
              className="px-8 py-3.5 rounded-xl bg-accent text-space font-semibold text-sm hover:bg-accent/90 transition-all duration-200 neon-glow"
            >
              Create Campaign
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3.5 rounded-xl glass border border-white/10 text-white font-semibold text-sm hover:bg-white/10 transition-all duration-200"
            >
              View Dashboard
            </Link>
          </div>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-space to-transparent pointer-events-none" />
    </section>
  )
}
