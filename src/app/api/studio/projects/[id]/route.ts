import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeString, sanitizeArray, validateId } from '@/lib/sanitize'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateId(params.id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const project = await prisma.videoProject.findUnique({
      where: { id: params.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      status: project.status,
      sourceUrl: project.sourceUrl,
      script: project.script,
      voiceProfile: project.voiceProfile,
      audioTrack: project.audioTrack,
      tracks: JSON.parse(project.tracks),
      assets: JSON.parse(project.assets),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('GET /api/studio/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateId(params.id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = sanitizeString(body.name, 200)
    if (body.status !== undefined) {
      const s = sanitizeString(body.status, 20)
      if (['DRAFT', 'ACTIVE', 'COMPLETED'].includes(s)) updateData.status = s
    }
    if (body.script !== undefined) updateData.script = sanitizeString(body.script, 10000)
    if (body.voiceProfile !== undefined) updateData.voiceProfile = sanitizeString(body.voiceProfile, 200)
    if (body.audioTrack !== undefined) updateData.audioTrack = sanitizeString(body.audioTrack, 200)
    if (body.tracks !== undefined) updateData.tracks = sanitizeJson(body.tracks)
    if (body.assets !== undefined) updateData.assets = sanitizeJson(body.assets)

    const project = await prisma.videoProject.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      id: project.id,
      name: project.name,
      status: project.status,
      updatedAt: project.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('PATCH /api/studio/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

function sanitizeJson(val: unknown): string {
  if (val === null || val === undefined) return '[]'
  if (typeof val === 'string') {
    try { JSON.parse(val); return val } catch { return '[]' }
  }
  try {
    return JSON.stringify(val)
  } catch {
    return '[]'
  }
}
