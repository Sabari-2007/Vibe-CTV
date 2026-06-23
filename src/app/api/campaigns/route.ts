import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        analytics: {
          select: { eventType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      dailyBudget: c.dailyBudget,
      totalBudget: c.totalBudget,
      spent: c.spent,
      genres: JSON.parse(c.genres),
      locations: JSON.parse(c.locations),
      videoUrl: c.videoUrl,
      impressions: c.analytics.filter((a) => a.eventType === 'IMPRESSION').length,
      completions: c.analytics.filter((a) => a.eventType === 'COMPLETED_100').length,
      createdAt: c.createdAt.toISOString(),
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, dailyBudget, totalBudget, genres, locations, videoUrl } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 })
    }

    const daily = Number(dailyBudget)
    const total = Number(totalBudget)

    if (isNaN(daily) || daily < 50) {
      return NextResponse.json({ error: 'Minimum daily budget is $50' }, { status: 400 })
    }

    if (isNaN(total) || total < daily) {
      return NextResponse.json({ error: 'Total budget must be at least the daily budget' }, { status: 400 })
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: name.trim(),
        dailyBudget: daily,
        totalBudget: total,
        genres: JSON.stringify(genres || []),
        locations: JSON.stringify(locations || []),
        videoUrl: videoUrl || null,
      },
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('POST /api/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
