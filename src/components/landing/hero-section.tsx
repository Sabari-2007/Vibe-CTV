'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const stats = [
  { label: 'Active Campaigns', value: '12K+' },
  { label: 'Impressions Served', value: '2.4B' },
  { label: 'Publisher Networks', value: '50+' },
  { label: 'Avg. VTR', value: '94%' },
]

const logos = ['Hotstar', 'JioCinema', 'Sony LIV', 'ZEE5', 'Hulu', 'Peacock', 'ESPN', 'Netflix', 'Disney+', 'Paramount+']

export function HeroSection() {
  return (
    <section className="relative pt-16 pb-20 overflow-hidden">
      <div className="absolute inset-0 grid-bg gradient-mask" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-accent/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="badge mb-4 justify-center"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Programmatic CTV Advertising Platform
          </motion.div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-ink mb-4 leading-[1.1]">
            Premium CTV Advertising{' '}
            <span className="text-gradient">Made Simple</span>
          </h1>

          <p className="text-lg md:text-xl text-ink-light max-w-2xl mx-auto mb-8 leading-relaxed">
            Launch, manage, and optimize programmatic TV campaigns across 50+ premium streaming networks.
            Real-time analytics, smart targeting, and AI-powered creative studio — all in one platform.
            Available in <strong className="text-ink">India</strong> and worldwide.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/campaign/new"
              className="btn-primary text-base px-8 py-3"
            >
              Start Free Trial
            </Link>
            <Link
              href="/dashboard"
              className="btn-secondary text-base px-8 py-3"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch Demo
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="card p-5 text-center card-hover"
            >
              <div className="text-2xl md:text-3xl font-bold text-accent mb-1">{stat.value}</div>
              <div className="text-xs text-ink-light">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <p className="text-xs text-ink-light/60 mb-4 uppercase tracking-wider font-medium">
            Trusted by leading brands across these networks
          </p>
          <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
            {logos.map((logo) => (
              <span
                key={logo}
                className="text-sm md:text-base font-semibold text-ink-light/40 hover:text-ink-light/60 transition-colors"
              >
                {logo}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 card p-6 md:p-8 max-w-4xl mx-auto"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="shrink-0">
              <svg viewBox="0 0 200 200" className="w-40 h-40 md:w-48 md:h-48">
                <path
                  d="M100 10 L190 70 L190 130 L100 190 L10 130 L10 70 Z"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                  opacity="0.3"
                />
                <path
                  d="M100 30 L170 75 L170 125 L100 170 L30 125 L30 75 Z"
                  fill="#2563EB"
                  opacity="0.08"
                  stroke="#2563EB"
                  strokeWidth="2"
                />
                <text x="100" y="85" textAnchor="middle" className="text-[9px]" fill="#2563EB" fontWeight="bold">INDIA</text>
                <text x="100" y="100" textAnchor="middle" className="text-[7px]" fill="#475569">Reach 500M+</text>
                <text x="100" y="115" textAnchor="middle" className="text-[7px]" fill="#475569">CTV Viewers</text>
                <circle cx="100" cy="75" r="4" fill="#2563EB" opacity="0.6" />
                <circle cx="60" cy="90" r="2" fill="#10B981" opacity="0.5" />
                <circle cx="140" cy="90" r="2" fill="#10B981" opacity="0.5" />
                <circle cx="100" cy="120" r="2" fill="#10B981" opacity="0.5" />
                <circle cx="80" cy="105" r="1.5" fill="#10B981" opacity="0.4" />
                <circle cx="120" cy="105" r="1.5" fill="#10B981" opacity="0.4" />
              </svg>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold text-ink mb-2">
                <span className="text-gradient">India-First</span> CTV Platform
              </h3>
              <p className="text-sm text-ink-light leading-relaxed">
                Reach over 500 million connected TV viewers across India. Partnered with Hotstar,
                JioCinema, Sony LIV, ZEE5 and more. Target by city, language, and content genre
                with our India-specific audience segments.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
