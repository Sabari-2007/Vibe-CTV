import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const budget = Math.min(50000, Math.max(500, Number(searchParams.get('budget')) || 5000))

  const analytics = await prisma.analyticsLog.findMany({
    select: { eventType: true, channel: true, cost: true },
  })

  const totalImp = analytics.filter(a => a.eventType === 'IMPRESSION').length
  const totalCost = analytics.reduce((s, a) => s + a.cost, 0)
  const avgCpm = totalImp > 0 ? (totalCost / totalImp) * 1000 : 12.5

  const channelData: Record<string, { impressions: number; cost: number }> = {}
  for (const a of analytics) {
    if (a.eventType === 'IMPRESSION') {
      if (!channelData[a.channel]) channelData[a.channel] = { impressions: 0, cost: 0 }
      channelData[a.channel].impressions++
      channelData[a.channel].cost += a.cost
    }
  }

  const baseImpressions = avgCpm > 0 ? Math.round((budget / avgCpm) * 1000) : Math.round(budget * 45)

  const data = Array.from({ length: 11 }, (_, i) => {
    const b = (budget / 10) * i
    const reach = Math.round(b * (baseImpressions / budget) * (1 + Math.sin((i / 10) * Math.PI) * 0.3))
    return { budget: b, reach }
  })

  const frequency = 3.2
  const totalReach = baseImpressions
  const effectiveReach = Math.round(totalReach / frequency)

  return NextResponse.json({
    data,
    metrics: {
      totalReach: totalReach.toLocaleString(),
      frequency: `${frequency}x`,
      effectiveReach: effectiveReach.toLocaleString(),
      avgCpm: avgCpm.toFixed(2),
      totalHistoricalImpressions: totalImp,
    },
  })
}
