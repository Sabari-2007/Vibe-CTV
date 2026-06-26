'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { StatWidget } from './stat-widget'
import { ImpressionChart } from './impression-chart'
import { ChannelBreakdown } from './channel-breakdown'
import { CampaignTable } from './campaign-table'
import { Button } from '@/components/ui/button'
import type { DashboardData, SimulatorTickResult } from '@/lib/types'

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [simulating, setSimulating] = useState(false)
  const [tickLog, setTickLog] = useState<string[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // silently retry on next interval
    }
  }, [])

  const runTick = useCallback(async () => {
    try {
      const res = await fetch('/api/simulator/tick', { method: 'POST' })
      if (res.ok) {
        const result: SimulatorTickResult = await res.json()
        setTickLog((prev) => {
          const next = [
            `[${new Date().toLocaleTimeString()}] ${result.impressions} impressions (${result.bids} bids, ${result.matched} matched)`,
            ...prev,
          ]
          return next.slice(0, 50)
        })
        await fetchDashboard()
      }
    } catch {
      // silently retry on next tick
    }
  }, [fetchDashboard])

  useEffect(() => {
    if (simulating) {
      runTick()
      intervalRef.current = setInterval(runTick, 3000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [simulating, runTick])

  useEffect(() => {
    const dashboardInterval = setInterval(fetchDashboard, 5000)
    return () => clearInterval(dashboardInterval)
  }, [fetchDashboard])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">Control Center</h1>
          <p className="text-ink-light text-xs sm:text-sm mt-0.5">Live campaign performance and telemetry</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-ink-light whitespace-nowrap">
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${simulating ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
            {simulating ? 'Traffic Active' : 'Traffic Idle'}
          </div>
          <Button
            onClick={() => setSimulating(!simulating)}
            variant={simulating ? 'danger' : 'primary'}
            className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
          >
            {simulating ? 'Stop Traffic' : 'Start Traffic'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatWidget
          label="Total Budget"
          value={`$${data.totalBudget.toFixed(2)}`}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatWidget
          label="Total Spent"
          value={`$${data.totalSpent.toFixed(2)}`}
          trend={`${data.totalBudget > 0 ? ((data.totalSpent / data.totalBudget) * 100).toFixed(1) : 0}% of budget`}
          trendUp={false}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatWidget
          label="View-Through Rate"
          value={`${data.vtr.toFixed(1)}%`}
          trend={`${data.activeCampaigns} active campaigns`}
          trendUp={true}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <StatWidget
          label="Active Campaigns"
          value={String(data.activeCampaigns)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ImpressionChart data={data.impressionsOverTime} />
        <ChannelBreakdown data={data.channelBreakdown} />
      </div>

      <CampaignTable campaigns={data.campaigns} />

      {simulating && tickLog.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <h3 className="text-xs font-medium text-ink-light mb-2">Traffic Activity</h3>
          <div className="h-32 overflow-y-auto space-y-0.5">
            {tickLog.map((entry, i) => (
              <div key={i} className="text-xs text-ink-light/60 font-mono">
                {entry}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
