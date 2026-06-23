import { prisma } from './prisma'
import type { EventType } from './types'

const CHANNELS = ['Hulu', 'Peacock', 'Tubi', 'Netflix', 'Disney+', 'Paramount+']
const GENRES = ['Sports', 'News', 'Movies', 'Entertainment', 'Comedy', 'Drama']
const LOCATIONS = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
]

interface BidRequest {
  location: string
  channel: string
  genre: string
  userId: string
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateBidRequest(): BidRequest {
  return {
    location: randomItem(LOCATIONS),
    channel: randomItem(CHANNELS),
    genre: randomItem(GENRES),
    userId: `viewer_${Math.random().toString(36).substring(2, 8)}`,
  }
}

function getCompletionEvents(): EventType[] {
  const completion = Math.random() * 100
  const events: EventType[] = ['IMPRESSION']
  if (completion >= 25) events.push('COMPLETED_25')
  if (completion >= 50) events.push('COMPLETED_50')
  if (completion >= 75) events.push('COMPLETED_75')
  if (completion >= 100) events.push('COMPLETED_100')
  return events
}

export async function runSimulationTick(): Promise<{
  bids: number
  matched: number
  impressions: number
}> {
  const bidCount = Math.floor(Math.random() * 3) + 1
  let matched = 0
  let impressions = 0

  for (let i = 0; i < bidCount; i++) {
    const bid = generateBidRequest()

    const activeCampaigns = await prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
    })

    const eligible = activeCampaigns.filter((c) => {
      if (c.spent >= c.totalBudget) return false
      const genres: string[] = JSON.parse(c.genres)
      const locations: string[] = JSON.parse(c.locations)
      if (genres.length === 0 && locations.length === 0) return true
      const genreMatch = genres.length === 0 || genres.includes(bid.genre)
      const locMatch = locations.length === 0 || locations.includes(bid.location)
      return genreMatch && locMatch
    })

    if (eligible.length === 0) continue
    matched++

    const sorted = eligible.sort(
      (a, b) => b.totalBudget - b.spent - (a.totalBudget - a.spent)
    )
    const campaign = sorted[0]

    const cost = 0.02
    const events = getCompletionEvents()

    await prisma.analyticsLog.createMany({
      data: events.map((eventType) => ({
        campaignId: campaign.id,
        channel: bid.channel,
        eventType,
        cost: eventType === 'IMPRESSION' ? cost : 0,
      })),
    })

    const newSpent = campaign.spent + cost
    const newStatus =
      newSpent >= campaign.totalBudget ? 'COMPLETED' : 'ACTIVE'

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        spent: { increment: cost },
        ...(newStatus === 'COMPLETED' ? { status: 'COMPLETED' } : {}),
      },
    })

    impressions++
  }

  return { bids: bidCount, matched, impressions }
}
