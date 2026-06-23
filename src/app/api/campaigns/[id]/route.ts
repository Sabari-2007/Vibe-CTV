import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        analytics: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...campaign,
      genres: JSON.parse(campaign.genres),
      locations: JSON.parse(campaign.locations),
    })
  } catch (error) {
    console.error('GET /api/campaigns/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.dailyBudget !== undefined) updateData.dailyBudget = body.dailyBudget
    if (body.totalBudget !== undefined) updateData.totalBudget = body.totalBudget
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl
    if (body.genres !== undefined) updateData.genres = JSON.stringify(body.genres)
    if (body.locations !== undefined) updateData.locations = JSON.stringify(body.locations)
    if (body.status !== undefined) updateData.status = body.status

    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('PATCH /api/campaigns/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}
