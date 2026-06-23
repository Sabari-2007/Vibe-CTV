import type { ScrapeLog } from './studio-types'
import * as cheerio from 'cheerio'

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
  'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800',
  'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=800',
  'https://images.unsplash.com/photo-1551434678-e07661122369?w=800',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
]

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateScript(brandName: string, headlines: string[], tagline: string, bullets: string[]): string {
  const hookLine = headlines[0] || `${brandName} is changing the game.`
  const featureLine = bullets.length > 0
    ? bullets.slice(0, 3).join(', ')
    : 'AI-powered automation & analytics'

  return `[HOOK - 0s to 5s]
Stop scrolling. ${hookLine}

[PROBLEM - 5s to 15s]
${tagline || 'Traditional advertising is broken. You\'re wasting budget on audiences that don\'t convert.'}

[SOLUTION - 15s to 25s]
${brandName} brings you: ${featureLine}. Real results. Full transparency.

[CTA - 25s to 30s]
Join thousands of brands already growing with ${brandName}. Start your first campaign today.`
}

const COLOR_PALETTE = ['#22548A', '#7B2CBF', '#D62828', '#2A9D8F', '#E76F51', '#264653', '#B5838D', '#6D597A']

function extractColors($: cheerio.CheerioAPI, html: string): string[] {
  const found: string[] = []

  const themeColor = $('meta[name="theme-color"]').attr('content')
  if (themeColor && /^#[0-9a-f]{6}$/i.test(themeColor)) found.push(themeColor)

  const styleMatch = html.match(/--(?:primary|accent|brand)-color\s*:\s*(#[0-9a-f]{3,8})/gi)
  if (styleMatch) {
    for (const m of styleMatch) {
      const hex = m.match(/(#[0-9a-f]{3,8})/i)
      if (hex) found.push(hex[1])
    }
  }

  const inlineColors = html.match(/color\s*:\s*(#[0-9a-f]{6})\b/gi)
  if (inlineColors) {
    for (const m of inlineColors.slice(0, 3)) {
      const hex = m.match(/(#[0-9a-f]{6})/i)
      if (hex) found.push(hex[1])
    }
  }

  return Array.from(new Set(found)).slice(0, 5)
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace('www.', '').split('.')[0]
  } catch {
    return url.split(/[/\s]/)[0] || 'brand'
  }
}

function capitalizeWords(s: string): string {
  return s
    .split(/[-_\s]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isLikelyUsefulImage(src: string): boolean {
  if (!src) return false
  const lower = src.toLowerCase()
  if (lower.includes('logo') || lower.includes('icon') || lower.includes('banner')
    || lower.includes('hero') || lower.includes('slide') || lower.includes('feature')) return true
  const bad = ['avatar', 'profile', 'spacer', 'pixel', 'transparent', 'tracking', 'analytics',
    'tiny', 'thumb', 'social', 'share', 'button', 'badge', 'close', 'menu', 'search', 'cart']
  const extMatch = lower.match(/\.(png|jpg|jpeg|webp|gif|svg)(\?|#|$)/)
  if (!extMatch) return false
  return !bad.some(b => lower.includes(b))
}

function absolutify(baseUrl: string, src: string): string {
  if (!src || src.startsWith('data:')) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  try {
    const base = new URL(baseUrl)
    return src.startsWith('//') ? `${base.protocol}${src}` : new URL(src, baseUrl).href
  } catch {
    return src
  }
}

export async function scrapeUrl(url: string, onLog: (log: ScrapeLog) => void) {
  const domain = extractDomain(url)
  const brandName = capitalizeWords(domain)
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  onLog({ step: 1, total: 7, message: 'Fetching website HTML...' })

  let html = ''
  let fetchSuccess = false
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })
    clearTimeout(timeout)
    html = await response.text()
    fetchSuccess = true
  } catch {
    html = ''
  }

  if (!fetchSuccess || html.length < 50) {
    onLog({ step: 1, total: 7, message: 'Failed to fetch HTML, using fallback data' })
    await sleep(400)
  } else {
    onLog({ step: 1, total: 7, message: `Fetched ${html.length.toLocaleString()} bytes` })
  }

  const $ = html ? cheerio.load(html) : null

  onLog({ step: 2, total: 7, message: 'Extracting brand name & logo...' })
  await sleep(200)

  let title = ''
  let siteName = ''
  let metaDesc = ''
  let logoUrl = ''

  if ($) {
    title = $('title').first().text().trim()
    siteName = $('meta[property="og:site_name"]').attr('content') || ''
    metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || ''

    const cleanedTitle = title
      .replace(/\s*[|–—-]\s*.*$/, '')
      .replace(/\s*&mdash;.*$/, '')
      .trim()

    const resolvedBrand = siteName || cleanedTitle || brandName

    const iconLink = $('link[rel="icon"]').attr('href')
      || $('link[rel="shortcut icon"]').attr('href')
      || $('link[rel="apple-touch-icon"]').attr('href')
      || $('link[rel="apple-touch-icon-precomposed"]').attr('href')
    if (iconLink) {
      logoUrl = absolutify(normalizedUrl, iconLink)
    }

    if (!logoUrl) {
      const ogImage = $('meta[property="og:image"]').attr('content')
      if (ogImage) logoUrl = absolutify(normalizedUrl, ogImage)
    }

    if (!logoUrl) {
      $('img').each((_, el) => {
        const src = $(el).attr('src') || ''
        const alt = $(el).attr('alt') || ''
        const cls = $(el).attr('class') || ''
        if (src.toLowerCase().includes('logo') || alt.toLowerCase().includes('logo') || cls.toLowerCase().includes('logo')) {
          const abs = absolutify(normalizedUrl, src)
          if (abs) { logoUrl = abs; return false }
        }
      })
    }
  }

  const resolvedBrandName = siteName || (title ? title.replace(/\s*[|–—-]\s*.*$/, '').trim() : '') || brandName

  onLog({ step: 3, total: 7, message: 'Analyzing brand colors...' })
  await sleep(200)

  let colors: string[] = []
  if ($) {
    colors = extractColors($, html)
  }

  onLog({ step: 4, total: 7, message: 'Scraping hero & product images...' })
  await sleep(200)

  const heroImages: string[] = []

  if ($) {
    const ogImage = $('meta[property="og:image"]').attr('content')
    if (ogImage) {
      const abs = absolutify(normalizedUrl, ogImage)
      if (abs) heroImages.push(abs)
    }

    const twitterImage = $('meta[name="twitter:image"]').attr('content') || $('meta[property="twitter:image"]').attr('content')
    if (twitterImage) {
      const abs = absolutify(normalizedUrl, twitterImage)
      if (abs && !heroImages.includes(abs)) heroImages.push(abs)
    }

    $('img').each((_, el) => {
      if (heroImages.length >= 10) return false
      const src = $(el).attr('src') || ''
      const abs = absolutify(normalizedUrl, src)
      if (abs && isLikelyUsefulImage(abs) && !heroImages.includes(abs)) {
        const w = parseInt($(el).attr('width') || '0')
        const h = parseInt($(el).attr('height') || '0')
        if ((w === 0 && h === 0) || w >= 100 || h >= 100) {
          heroImages.push(abs)
        }
      }
    })
  }

  if (heroImages.length === 0) {
    heroImages.push(...shuffleArray([...FALLBACK_IMAGES]).slice(0, 5))
  } else if (heroImages.length < 3) {
    const needed = 5 - heroImages.length
    heroImages.push(...shuffleArray([...FALLBACK_IMAGES]).slice(0, needed))
  }

  onLog({ step: 5, total: 7, message: 'Extracting text content for ad copy...' })
  await sleep(200)

  const headlines: string[] = []
  const featureBullets: string[] = []

  if ($) {
    $('h1').each((_, el) => {
      const txt = $(el).text().trim()
      if (txt && txt.length < 120) headlines.push(txt)
    })

    $('h2').each((_, el) => {
      if (headlines.length >= 3) return false
      const txt = $(el).text().trim()
      if (txt && txt.length < 100 && !headlines.includes(txt)) headlines.push(txt)
    })

    $('li').each((_, el) => {
      if (featureBullets.length >= 8) return false
      const txt = $(el).text().trim()
      if (txt && txt.length > 5 && txt.length < 160) {
        featureBullets.push(txt)
      }
    })

    if (featureBullets.length < 3) {
      $('p').each((_, el) => {
        if (featureBullets.length >= 5) return false
        const txt = $(el).text().trim()
        if (txt && txt.length > 10 && txt.length < 120
          && !headlines.includes(txt)
          && !txt.startsWith('http')
          && !txt.includes('cookie')
        ) {
          featureBullets.push(txt)
        }
      })
    }
  }

  if (headlines.length === 0) headlines.push('Transform Your Business Today')
  if (featureBullets.length === 0) {
    featureBullets.push(
      'AI-powered automation & analytics',
      'Enterprise-grade security & compliance',
      '24/7 dedicated support team',
      'Seamless integration with existing tools',
      'Real-time performance dashboards',
    )
  }

  const accentColor = colors[0] || COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
  const tagline = metaDesc || 'Innovative solutions designed for the modern enterprise'
  const script = generateScript(resolvedBrandName, headlines, tagline, featureBullets)

  onLog({ step: 6, total: 7, message: 'Gathering contact information...' })
  await sleep(200)

  let phone = ''
  let address = ''
  if ($) {
    const bodyText = $('body').text()
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
    const phones = bodyText.match(phoneRegex)
    if (phones) phone = phones[0].trim()

    $('a[href^="tel:"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      phone = href.replace('tel:', '').trim()
      return false
    })
  }

  onLog({ step: 7, total: 7, message: 'Compiling all assets into video timeline...' })
  await sleep(200)

  const websiteUrl = normalizedUrl
  const slides = heroImages.slice(0, 5).map((img, i) => ({
    id: generateId(),
    imageUrl: img,
    startTime: i * 6,
    endTime: (i + 1) * 6,
    label: `Slide ${i + 1}`,
  }))

  return {
    brandName: resolvedBrandName,
    logoUrl,
    heroImages: heroImages.slice(0, 5),
    headlines,
    tagline,
    featureBullets: featureBullets.slice(0, 6),
    accentColor,
    script,
    slides,
    bottomBanner: {
      logoUrl: logoUrl || '',
      companyName: resolvedBrandName,
      address,
      phone,
      websiteUrl,
    },
    endScreen: {
      logoUrl: logoUrl || '',
      companyName: resolvedBrandName,
      address,
      phone,
      websiteUrl,
      accentColor,
    },
  }
}
