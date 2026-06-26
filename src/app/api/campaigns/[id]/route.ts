import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeString, sanitizeNumber, sanitizeArray, validateId } from '@/lib/sanitize'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateId(params.id)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 })
    }

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
    if (!validateId(params.id)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = sanitizeString(body.name, 200)
    if (body.dailyBudget !== undefined) updateData.dailyBudget = sanitizeNumber(body.dailyBudget, 50)
    if (body.totalBudget !== undefined) updateData.totalBudget = sanitizeNumber(body.totalBudget, 50)
    if (body.videoUrl !== undefined) {
      const url = sanitizeString(body.videoUrl, 2000)
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        return NextResponse.json({ error: 'Invalid videoUrl format' }, { status: 400 })
      }
      updateData.videoUrl = url || null
    }
    if (body.genres !== undefined) updateData.genres = JSON.stringify(sanitizeArray(body.genres, 20))
    if (body.locations !== undefined) updateData.locations = JSON.stringify(sanitizeArray(body.locations, 20))
    if (body.status !== undefined) {
      const s = sanitizeString(body.status, 20)
      if (['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'].includes(s)) updateData.status = s
    }

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
