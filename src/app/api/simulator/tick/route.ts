import { NextResponse } from 'next/server'
import { runSimulationTick } from '@/lib/simulator'

export async function POST() {
  try {
    const result = await runSimulationTick()
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/simulator/tick error:', error)
    return NextResponse.json(
      { error: 'Simulation tick failed', bids: 0, matched: 0, impressions: 0 },
      { status: 500 }
    )
  }
}
