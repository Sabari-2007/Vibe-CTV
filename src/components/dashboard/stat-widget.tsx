'use client'

import { motion } from 'framer-motion'

interface StatWidgetProps {
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  icon: React.ReactNode
}

export function StatWidget({ label, value, trend, trendUp, icon }: StatWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="card p-6"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-ink-light font-medium">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-ink mb-1">{value}</div>
      {trend && (
        <div className={`text-xs flex items-center gap-1 ${trendUp ? 'text-success' : 'text-red-500'}`}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trendUp ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
          </svg>
          {trend}
        </div>
      )}
    </motion.div>
  )
}
