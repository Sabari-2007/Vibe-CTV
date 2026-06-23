import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const projects = await prisma.videoProject.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const data = projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      sourceUrl: p.sourceUrl,
      script: p.script,
      voiceProfile: p.voiceProfile,
      audioTrack: p.audioTrack,
      tracks: JSON.parse(p.tracks),
      assets: JSON.parse(p.assets),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/studio/projects error:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, sourceUrl, script, voiceProfile, audioTrack, tracks, assets } = body

    const project = await prisma.videoProject.create({
      data: {
        name: name || 'Untitled Project',
        sourceUrl: sourceUrl || null,
        script: script || null,
        voiceProfile: voiceProfile || null,
        audioTrack: audioTrack || null,
        tracks: JSON.stringify(tracks || []),
        assets: JSON.stringify(assets || []),
      },
    })

    return NextResponse.json({
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/studio/projects error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
