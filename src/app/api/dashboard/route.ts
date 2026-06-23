import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { DashboardData } from '@/lib/types'

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        analytics: {
          select: { eventType: true, channel: true, timestamp: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalBudget = campaigns.reduce((s, c) => s + c.totalBudget, 0)
    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
    const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length

    let totalImpressions = 0
    let totalCompletions = 0
    const channelMap: Record<string, number> = {}
    const hourlyMap: Record<string, number> = {}

    const now = new Date()
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000)
      hourlyMap[d.toISOString().substring(0, 13) + ':00'] = 0
    }

    for (const c of campaigns) {
      for (const log of c.analytics) {
        if (log.eventType === 'IMPRESSION') {
          totalImpressions++
          const key = log.timestamp.toISOString().substring(0, 13) + ':00'
          if (hourlyMap[key] !== undefined) hourlyMap[key]++
          channelMap[log.channel] = (channelMap[log.channel] || 0) + 1
        }
        if (log.eventType === 'COMPLETED_100') {
          totalCompletions++
        }
      }
    }

    const impressionsOverTime = Object.entries(hourlyMap)
      .map(([time, impressions]) => ({ time, impressions }))
      .sort((a, b) => a.time.localeCompare(b.time))

    const channelBreakdown = Object.entries(channelMap)
      .map(([channel, impressions]) => ({ channel, impressions }))
      .sort((a, b) => b.impressions - a.impressions)

    const vtr = totalImpressions > 0 ? (totalCompletions / totalImpressions) * 100 : 0

    const campaignSummaries = campaigns.map((c) => {
      const imp = c.analytics.filter((l) => l.eventType === 'IMPRESSION').length
      const comp = c.analytics.filter((l) => l.eventType === 'COMPLETED_100').length
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        dailyBudget: c.dailyBudget,
        totalBudget: c.totalBudget,
        spent: c.spent,
        genres: JSON.parse(c.genres) as string[],
        locations: JSON.parse(c.locations) as string[],
        videoUrl: c.videoUrl,
        impressions: imp,
        completions: comp,
        createdAt: c.createdAt.toISOString(),
      }
    })

    const data: DashboardData = {
      totalBudget,
      totalSpent,
      activeCampaigns,
      vtr,
      impressionsOverTime,
      channelBreakdown,
      campaigns: campaignSummaries,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
