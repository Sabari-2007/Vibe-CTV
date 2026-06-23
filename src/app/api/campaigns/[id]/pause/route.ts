import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: { status: newStatus },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('POST /api/campaigns/[id]/pause error:', error)
    return NextResponse.json({ error: 'Failed to toggle campaign status' }, { status: 500 })
  }
}
