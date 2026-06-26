import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 30

function getRateLimitInfo(ip: string) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    const newEntry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW }
    rateLimitMap.set(ip, newEntry)
    return { remaining: RATE_LIMIT_MAX - 1, resetAt: newEntry.resetAt }
  }
  entry.count++
  return { remaining: Math.max(0, RATE_LIMIT_MAX - entry.count), resetAt: entry.resetAt }
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  const url = request.nextUrl.pathname
  if (url.startsWith('/studio')) {
    response.headers.set(
      'Cross-Origin-Embedder-Policy',
      'require-corp',
    )
    response.headers.set(
      'Cross-Origin-Opener-Policy',
      'same-origin',
    )
  }

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  if (url.startsWith('/api/')) {
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1'

    const info = getRateLimitInfo(ip)
    response.headers.set('X-RateLimit-Remaining', String(info.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(info.resetAt / 1000)))

    if (info.remaining <= 0 && request.method !== 'GET') {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((info.resetAt - Date.now()) / 1000)) } },
      )
    }
  }

  const csp: string[] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
  response.headers.set('Content-Security-Policy', csp.join('; '))

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
