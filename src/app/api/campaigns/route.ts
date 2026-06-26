import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeString, sanitizeNumber, sanitizeArray } from '@/lib/sanitize'

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        analytics: {
          select: { eventType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
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
    const name = sanitizeString(body.name, 200)
    const videoUrl = sanitizeString(body.videoUrl, 2000)
    const dailyBudget = sanitizeNumber(body.dailyBudget, 50)
    const totalBudget = sanitizeNumber(body.totalBudget, 50)
    const genres = sanitizeArray(body.genres, 20)
    const locations = sanitizeArray(body.locations, 20)

    if (!name) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 })
    }

    if (videoUrl && !videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid videoUrl format' }, { status: 400 })
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        dailyBudget,
        totalBudget,
        spent: 0,
        genres: JSON.stringify(genres),
        locations: JSON.stringify(locations),
        videoUrl: videoUrl || null,
      },
    })

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      dailyBudget: campaign.dailyBudget,
      totalBudget: campaign.totalBudget,
      createdAt: campaign.createdAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
