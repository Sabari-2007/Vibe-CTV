import { NextResponse } from 'next/server'
import { scrapeUrl } from '@/lib/scraper'
import type { ScrapeLog } from '@/lib/studio-types'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Only http and https URLs are allowed' }, { status: 400 })
    }

    const logs: ScrapeLog[] = []

    const data = await scrapeUrl(url, (log) => {
      logs.push(log)
    })

    return NextResponse.json({ data, logs })
  } catch (error) {
    console.error('POST /api/studio/scrape error:', error)
    return NextResponse.json({ error: 'Scraping failed' }, { status: 500 })
  }
}
