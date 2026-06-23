import { NextResponse } from 'next/server'

const CREATOMATE_API_KEY = 'fde2311bb2f44f2e81f8f5894e175965fe2a7d849147ccd80d72759ba8e3a7fe1bd6003b7457c076e76c8b0ea26bb9b1'
const CREATOMATE_API = 'https://api.creatomate.com/v1'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slides, brandName, tagline, featureBullets, bottomBanner, endScreen, musicGenre, script, voiceProfile, logoUrl } = body

    const template = buildTemplate({
      slides,
      brandName,
      tagline,
      featureBullets,
      bottomBanner,
      endScreen,
      musicGenre,
      script,
      voiceProfile,
      logoUrl,
    })

    const response = await fetch(`${CREATOMATE_API}/renders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CREATOMATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Creatomate API error:', response.status, errorText)
      return NextResponse.json({ error: 'Creatomate render failed', details: errorText }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ renderId: data.id, status: data.status, url: data.url })
  } catch (error) {
    console.error('POST /api/creatomate/render error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const renderId = searchParams.get('renderId')

    if (!renderId) {
      return NextResponse.json({ error: 'renderId is required' }, { status: 400 })
    }

    const response = await fetch(`${CREATOMATE_API}/renders/${renderId}`, {
      headers: {
        'Authorization': `Bearer ${CREATOMATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch render status' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({
      id: data.id,
      status: data.status,
      url: data.url,
      progress: data.progress,
    })
  } catch (error) {
    console.error('GET /api/creatomate/render error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildTemplate(params: {
  slides: any[]
  brandName: string
  tagline: string
  featureBullets: string[]
  bottomBanner: any
  endScreen: any
  musicGenre: string
  script: string
  voiceProfile: string
  logoUrl: string
}) {
  const elements: any[] = []

  params.slides.forEach((slide, i) => {
    elements.push({
      type: 'Image',
      source: slide.imageUrl,
      duration: (slide.endTime - slide.startTime),
      x: 0, y: 0, width: '100%', height: '100%',
      transitionIn: 'fade',
      transitionOut: 'fade',
    })

    if (i === 0 && params.brandName) {
      elements.push({
        type: 'Text',
        text: params.brandName,
        duration: (slide.endTime - slide.startTime),
        x: '5%', y: '70%',
        width: '90%', height: '15%',
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#ffffff',
        fontFamily: 'Instrument Sans',
      })
    }

    if (i === 0 && params.tagline) {
      elements.push({
        type: 'Text',
        text: params.tagline,
        duration: (slide.endTime - slide.startTime),
        x: '5%', y: '82%',
        width: '90%', height: '8%',
        fontSize: '20px',
        color: '#ffffffcc',
        fontFamily: 'Instrument Sans',
      })
    }

    if (params.featureBullets.length > 0 && i < params.featureBullets.length) {
      elements.push({
        type: 'RoundedRectangle',
        duration: (slide.endTime - slide.startTime),
        x: '5%', y: `${88 + i * 5}%`,
        width: `${params.featureBullets[i].length * 12 + 30}px`,
        height: '32px',
        fillColor: '#ffffff20',
        borderRadius: '16px',
      })
      elements.push({
        type: 'Text',
        text: params.featureBullets[i],
        duration: (slide.endTime - slide.startTime),
        x: '7%', y: `${88 + i * 5}%`,
        width: '80%', height: '32px',
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'Instrument Sans',
        alignment: 'center',
      })
    }

    if (i === 0 && params.logoUrl) {
      elements.push({
        type: 'Image',
        source: params.logoUrl,
        duration: (slide.endTime - slide.startTime),
        x: '3%', y: '3%',
        width: '48px', height: '48px',
      })
    }
  })

  if (params.bottomBanner?.companyName) {
    elements.push({
      type: 'RoundedRectangle',
      duration: params.slides.length > 0 ? params.slides.length * 4 - 4 : 20,
      x: '0', y: '90%',
      width: '100%', height: '10%',
      fillColor: '#fffffff0',
    })
    elements.push({
      type: 'Text',
      text: params.bottomBanner.companyName,
      duration: params.slides.length > 0 ? params.slides.length * 4 - 4 : 20,
      x: '5%', y: '91%',
      width: '50%', height: '8%',
      fontSize: '16px',
      color: '#000000',
        fontFamily: 'Instrument Sans',
      fontWeight: 'bold',
    })
    if (params.bottomBanner.websiteUrl) {
      elements.push({
        type: 'Text',
        text: params.bottomBanner.websiteUrl,
        duration: params.slides.length > 0 ? params.slides.length * 4 - 4 : 20,
        x: '60%', y: '91%',
        width: '35%', height: '8%',
        fontSize: '12px',
        color: '#00000080',
        fontFamily: 'Instrument Sans',
        alignment: 'right',
      })
    }
  }

  elements.push({
    type: 'Rectangle',
    duration: 4,
    x: '0', y: '0',
    width: '100%', height: '100%',
    fillColor: params.endScreen?.accentColor || '#22548A',
    transitionIn: 'fade',
  })

  elements.push({
    type: 'Text',
    text: params.endScreen?.companyName || params.brandName,
    duration: 4,
    x: '10%', y: '35%',
    width: '80%', height: '20%',
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter',
    alignment: 'center',
  })

  if (params.endScreen?.websiteUrl) {
    elements.push({
      type: 'Text',
      text: params.endScreen.websiteUrl,
      duration: 4,
      x: '10%', y: '55%',
      width: '80%', height: '10%',
      fontSize: '18px',
      color: '#ffffffb0',
        fontFamily: 'Instrument Sans',
      alignment: 'center',
    })
  }

  return {
    template: {
      outputFormat: 'mp4',
      width: 1920,
      height: 1080,
      frameRate: 30,
      elements,
    },
    ...(params.musicGenre ? {
      audio: {
        type: 'text-to-speech',
        text: params.script || '',
        voice: params.voiceProfile?.split(',')[0]?.trim().toLowerCase() || 'male',
      },
    } : {}),
  }
}
