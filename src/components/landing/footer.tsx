'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export function GlobalFooter() {
  return (
    <footer className="border-t border-muted bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/lumina-logo.png" alt="Lumina" width={32} height={32} className="rounded-lg" />
              <span className="font-semibold text-ink" style={{ fontFamily: "'Stack Sans Notch', sans-serif" }}>Lumina</span>
            </div>
            <p className="text-sm text-ink-light leading-relaxed">
              AI-powered programmatic CTV advertising platform. Real-time analytics, smart targeting, and creative studio.
            </p>
            <div className="flex items-center gap-2 text-xs text-ink-light/60">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              System Architecture: v2.4.1 — Operational
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2">
              {[
                { label: 'Campaign Studio', href: '/campaign/new' },
                { label: 'Live Analytics', href: '/dashboard' },
                { label: 'Video Studio', href: '/studio' },
                { label: 'Bidding Exchange', href: '/dashboard' },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-ink-light hover:text-accent transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">Compliance</h4>
            <ul className="space-y-2">
              {[
                { label: 'OpenRTB Standards', href: '#' },
                { label: 'Privacy Policy', href: '#' },
                { label: 'Data Processing', href: '#' },
                { label: 'Ad Choices', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-ink-light hover:text-accent transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">System Status</h4>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="card p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-ink font-medium">All Ad Exchange Nodes Operational</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Bid Request Latency', value: '12ms' },
                  { label: 'Fill Rate', value: '98.7%' },
                  { label: 'Active Connections', value: '1,247' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between text-xs">
                    <span className="text-ink-light">{stat.label}</span>
                    <span className="text-accent font-mono font-medium">{stat.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-muted flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-[10px] sm:text-xs text-ink-light/60">
          <span>&copy; {new Date().getFullYear()} Lumina. All rights reserved.</span>
          <span>Powered by Next.js + Prisma + PostgreSQL</span>
        </div>
      </div>
    </footer>
  )
}
