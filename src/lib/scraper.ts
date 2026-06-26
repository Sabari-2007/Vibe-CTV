import type { ScrapeLog } from './studio-types'
import * as cheerio from 'cheerio'

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1920&q=80',
  'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1920&q=80',
  'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=1920&q=80',
  'https://images.unsplash.com/photo-1551434678-e07661122369?w=1920&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1920&q=80',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1920&q=80',
]

const MAX_PAGES = 50
const CONCURRENCY = 5
const CRAWL_DELAY_MS = 200

interface CrawledPage {
  url: string
  title: string
  depth: number
  html: string
  $: cheerio.CheerioAPI | null
  error?: string
}

interface PageData {
  url: string
  title: string
  depth: number
  metaDescription: string
  headings: string[]
  paragraphs: string[]
  listItems: string[]
  images: string[]
  links: string[]
  phone: string
  email: string
  socialLinks: string[]
  structuredData: Record<string, unknown>[]
}

function absolutify(baseUrl: string, src: string): string {
  if (!src || src.startsWith('data:')) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  try {
    const base = new URL(baseUrl)
    if (src.startsWith('//')) return `${base.protocol}${src}`
    return new URL(src, baseUrl).href
  } catch {
    return src
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url.replace(/https?:\/\//, '').split('/')[0].replace('www.', '')
  }
}

function normalizeUrl(href: string, baseUrl: string, domain: string): string | null {
  try {
    const abs = absolutify(baseUrl, href)
    if (!abs) return null
    const u = new URL(abs)
    if (u.hostname.replace('www.', '') !== domain) return null
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    u.hash = ''
    const path = u.pathname.replace(/\/+$/, '') || '/'
    const blockedExtensions = ['.pdf', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm',
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif',
      '.css', '.js', '.json', '.xml', '.rss', '.atom', '.woff', '.woff2',
      '.ttf', '.eot', '.otf']
    const ext = path.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
    if (ext && blockedExtensions.includes(`.${ext}`)) return null
    return u.origin + path
  } catch {
    return null
  }
}

function isInternalUrl(url: string, domain: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '') === domain
  } catch {
    return false
  }
}

async function fetchPage(url: string): Promise<{ html: string; ok: boolean }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })
    clearTimeout(timeout)
    const html = await response.text()
    return { html, ok: html.length >= 50 }
  } catch {
    return { html: '', ok: false }
  }
}

function extractPageData(page: CrawledPage): PageData {
  const data: PageData = {
    url: page.url,
    title: '',
    depth: page.depth,
    metaDescription: '',
    headings: [],
    paragraphs: [],
    listItems: [],
    images: [],
    links: [],
    phone: '',
    email: '',
    socialLinks: [],
    structuredData: [],
  }

  if (!page.$) return data

  const $ = page.$

  data.title = $('title').first().text().trim()
  data.metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || ''

  $('h1, h2, h3').each((_, el) => {
    const txt = $(el).text().trim()
    if (txt && txt.length < 200) data.headings.push(txt)
  })

  $('p').each((_, el) => {
    const txt = $(el).text().trim()
    if (txt && txt.length > 15 && txt.length < 500) data.paragraphs.push(txt)
  })

  $('li').each((_, el) => {
    const txt = $(el).text().trim()
    if (txt && txt.length > 5 && txt.length < 200) data.listItems.push(txt)
  })

  $('img, source').each((_, el) => {
    const src = $(el).attr('src')
      || $(el).attr('data-src')
      || $(el).attr('data-lazy')
      || $(el).attr('data-original')
      || $(el).attr('data-srcset')?.split(' ')[0]
      || ''
    const srcset = $(el).attr('srcset')
    const finalSrc = src || (srcset ? srcset.split(' ')[0] : '')
    const abs = absolutify(page.url, finalSrc)
    if (abs) data.images.push(abs)
  })

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const abs = absolutify(page.url, href)
    if (abs) data.links.push(abs)
  })

  $('a[href^="tel:"]').each((_, el) => {
    data.phone = ($(el).attr('href') || '').replace('tel:', '').trim()
  })

  if (!data.phone) {
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
    const match = $('body').text().match(phoneRegex)
    if (match) data.phone = match[0].trim()
  }

  $('a[href^="mailto:"]').each((_, el) => {
    data.email = ($(el).attr('href') || '').replace('mailto:', '').split('?')[0]
  })

  const socialDomains = ['facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com',
    'youtube.com', 'tiktok.com', 'pinterest.com', 'github.com', 'medium.com']
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    try {
      const u = new URL(absolutify(page.url, href))
      if (socialDomains.some(d => u.hostname.includes(d))) {
        data.socialLinks.push(u.href)
      }
    } catch {}
  })

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).text())
      data.structuredData.push(parsed)
    } catch {}
  })

  data.images = Array.from(new Set(data.images))
  data.headings = Array.from(new Set(data.headings))
  data.paragraphs = Array.from(new Set(data.paragraphs))
  data.listItems = Array.from(new Set(data.listItems))
  data.socialLinks = Array.from(new Set(data.socialLinks))

  return data
}

function isLikelyUsefulImage(src: string): boolean {
  if (!src || src.startsWith('data:')) return false
  const lower = src.toLowerCase()
  if (lower.includes('logo') || lower.includes('icon') || lower.includes('banner')
    || lower.includes('hero') || lower.includes('slide') || lower.includes('feature')) return true
  const bad = ['avatar', 'profile', 'spacer', 'pixel', 'transparent', 'tracking', 'analytics',
    'tiny', 'thumb', 'social', 'share', 'button', 'badge', 'close', 'menu', 'search', 'cart',
    'loading', 'spinner', 'placeholder', 'dot', 'sprite', 'arrow', 'chevron', 'hamburger']
  const extMatch = lower.match(/\.(png|jpg|jpeg|webp|gif|svg|avif)(\?|#|$)/)
  if (!extMatch) {
    if (lower.includes('/photos/') || lower.includes('/images/') || lower.includes('/media/')
      || lower.includes('/uploads/') || lower.includes('/img/') || lower.includes('/pics/')
      || lower.includes('unsplash') || lower.includes('cloudinary') || lower.includes('imgix')
      || lower.includes('cdn') || lower.includes('wp-content')) return true
    return false
  }
  return !bad.some(b => lower.includes(b))
}

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

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

const COLOR_PALETTE = ['#22548A', '#7B2CBF', '#D62828', '#2A9D8F', '#E76F51', '#264653', '#B5838D', '#6D597A']

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export async function scrapeUrl(url: string, onLog: (log: ScrapeLog) => void) {
  const startUrl = url.startsWith('http') ? url : `https://${url}`
  const domain = extractDomain(startUrl)
  const crawled = new Map<string, CrawledPage>()
  const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }]
  const visited = new Set<string>()
  const allPageData: PageData[] = []

  onLog({ step: 1, total: 8, message: `Starting crawl of ${domain}...` })

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const batch = queue.splice(0, CONCURRENCY).filter(item => !visited.has(item.url))
    if (batch.length === 0) continue

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const normalizedUrl = normalizeUrl(item.url, startUrl, domain)
        if (!normalizedUrl || visited.has(normalizedUrl)) return null
        visited.add(normalizedUrl)

        const { html, ok } = await fetchPage(normalizedUrl)
        if (!ok) {
          crawled.set(normalizedUrl, { url: normalizedUrl, title: '', depth: item.depth, html: '', $: null, error: 'Failed to fetch' })
          return null
        }

        const $ = cheerio.load(html)
        const page: CrawledPage = { url: normalizedUrl, title: $('title').first().text().trim(), depth: item.depth, html, $ }
        crawled.set(normalizedUrl, page)

        const internalLinks: string[] = []
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') || ''
          const abs = normalizeUrl(href, normalizedUrl, domain)
          if (abs && !visited.has(abs)) internalLinks.push(abs)
        })

        return { page, internalLinks }
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const { page, internalLinks } = result.value
        const newLinks = internalLinks.filter(l => !visited.has(l))
        for (const link of newLinks) {
          if (!queue.some(q => q.url === link)) {
            queue.push({ url: link, depth: page.depth + 1 })
          }
        }
      }
    }

    await new Promise(r => setTimeout(r, CRAWL_DELAY_MS))
  }

  onLog({ step: 2, total: 8, message: `Crawled ${crawled.size} pages. Extracting content...` })

  crawled.forEach((page) => {
    const data = extractPageData(page)
    allPageData.push(data)
  })

  allPageData.sort((a, b) => a.depth - b.depth)

  const sitemap = allPageData.map(p => ({
    url: p.url,
    title: p.title,
    depth: p.depth,
    imageCount: p.images.length,
    textLength: p.paragraphs.join(' ').length,
  }))

  onLog({ step: 3, total: 8, message: 'Aggregating brand information...' })

  const homePage = allPageData.find(p => {
    try { return new URL(p.url).pathname === '/' } catch { return false }
  }) || allPageData[0]

  let siteName = ''
  let logoUrl = ''

  if (homePage) {
    const $home = crawled.get(homePage.url)?.$
    if ($home) {
      siteName = $home('meta[property="og:site_name"]').attr('content') || ''
      const iconLink = $home('link[rel="icon"]').attr('href')
        || $home('link[rel="shortcut icon"]').attr('href')
        || $home('link[rel="apple-touch-icon"]').attr('href')
        || $home('link[rel="apple-touch-icon-precomposed"]').attr('href')
      if (iconLink) logoUrl = absolutify(homePage.url, iconLink)
      if (!logoUrl) {
        const ogImage = $home('meta[property="og:image"]').attr('content')
        if (ogImage) logoUrl = absolutify(homePage.url, ogImage)
      }
      if (!logoUrl) {
        $home('img').each((_, el) => {
          const src = $home(el).attr('src') || ''
          const alt = $home(el).attr('alt') || ''
          const cls = $home(el).attr('class') || ''
          if (src.toLowerCase().includes('logo') || alt.toLowerCase().includes('logo') || cls.toLowerCase().includes('logo')) {
            const abs = absolutify(homePage.url, src)
            if (abs) { logoUrl = abs; return false }
          }
        })
      }
    }
  }

  const domainName = domain.split('.')[0]
  const brandName = siteName || (homePage?.title.replace(/\s*[|–—-]\s*.*$/, '').trim() || domainName.replace(/^www\./, ''))

  function capitalizeWords(s: string): string {
    return s.split(/[-_\s]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }

  const resolvedBrandName = capitalizeWords(brandName)

  onLog({ step: 4, total: 8, message: 'Extracting brand colors...' })

  const allColors: string[] = []
  crawled.forEach((page) => {
    if (page.$) {
      const colors = extractColors(page.$, page.html)
      allColors.push(...colors)
    }
  })
  const colors = Array.from(new Set(allColors)).slice(0, 5)

  onLog({ step: 5, total: 8, message: `Collecting images from ${allPageData.length} pages...` })

  const allImages: string[] = []
  const seenUrls = new Set<string>()
  for (const data of allPageData) {
    for (const img of data.images) {
      if (seenUrls.has(img)) continue
      seenUrls.add(img)
      if (isLikelyUsefulImage(img)) {
        const w = 0
        const h = 0
        if ((w === 0 && h === 0) || w >= 100 || h >= 100) {
          allImages.push(img)
        }
      }
    }
  }

  let heroImages = allImages.slice(0, 20)
  if (heroImages.length < 5) {
    const needed = 10 - heroImages.length
    heroImages.push(...shuffleArray([...FALLBACK_IMAGES]).slice(0, Math.max(needed, 0)))
  }

  onLog({ step: 6, total: 8, message: 'Extracting ad copy from all pages...' })

  const allHeadlines: string[] = []
  const allFeatureBullets: string[] = []

  for (const data of allPageData) {
    for (const h of data.headings) {
      if (h.length < 120 && !allHeadlines.includes(h)) allHeadlines.push(h)
    }
    for (const li of data.listItems) {
      if (li.length > 5 && li.length < 160 && !allFeatureBullets.includes(li)) allFeatureBullets.push(li)
    }
  }

  if (allFeatureBullets.length < 3) {
    for (const data of allPageData) {
      for (const p of data.paragraphs) {
        if (allFeatureBullets.length >= 8) break
        if (p.length > 10 && p.length < 120 && !allHeadlines.includes(p) && !p.startsWith('http') && !p.includes('cookie')) {
          allFeatureBullets.push(p)
        }
      }
      if (allFeatureBullets.length >= 8) break
    }
  }

  const headlines = allHeadlines.slice(0, 5)
  const featureBullets = allFeatureBullets.slice(0, 8)
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

  onLog({ step: 7, total: 8, message: 'Gathering contact information...' })

  let phone = ''
  let email = ''
  let address = ''
  const allSocialLinks: string[] = []

  for (const data of allPageData) {
    if (data.phone && !phone) phone = data.phone
    if (data.email && !email) email = data.email
    allSocialLinks.push(...data.socialLinks)
  }

  const bodyText = allPageData.map(d => d.paragraphs.join(' ')).join(' ')
  const addrRegex = /\d{1,5}\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir)\b/i
  const addrMatch = bodyText.match(addrRegex)
  if (addrMatch) address = addrMatch[0].trim()

  const tagline = homePage?.metaDescription || 'Innovative solutions designed for the modern enterprise'
  const script = generateScript(resolvedBrandName, headlines, tagline, featureBullets)

  onLog({ step: 8, total: 8, message: `Compiling assets from ${allPageData.length} pages into ad timeline...` })

  const slides = heroImages.slice(0, 12).map((img, i) => ({
    id: generateId(),
    imageUrl: img,
    startTime: i * 3,
    endTime: (i + 1) * 3,
    label: `Slide ${i + 1}`,
  }))

  return {
    brandName: resolvedBrandName,
    logoUrl,
    heroImages: heroImages.slice(0, 12),
    headlines,
    tagline,
    featureBullets: featureBullets.slice(0, 6),
    accentColor,
    colors,
    script,
    slides,
    sitemap,
    pages: allPageData.map(p => ({
      url: p.url,
      title: p.title,
      depth: p.depth,
      headingCount: p.headings.length,
      imageCount: p.images.length,
      wordCount: p.paragraphs.join(' ').split(/\s+/).length,
    })),
    pageCount: crawled.size,
    socialLinks: Array.from(new Set(allSocialLinks)),
    phone,
    email,
    address,
    bottomBanner: {
      logoUrl: logoUrl || '',
      companyName: resolvedBrandName,
      address,
      phone,
      email,
      websiteUrl: startUrl,
    },
    endScreen: {
      logoUrl: logoUrl || '',
      companyName: resolvedBrandName,
      address,
      phone,
      email,
      websiteUrl: startUrl,
      accentColor,
    },
  }
}
