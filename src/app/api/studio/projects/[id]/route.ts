import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.status !== undefined) updateData.status = body.status
    if (body.script !== undefined) updateData.script = body.script
    if (body.voiceProfile !== undefined) updateData.voiceProfile = body.voiceProfile
    if (body.audioTrack !== undefined) updateData.audioTrack = body.audioTrack
    if (body.tracks !== undefined) updateData.tracks = JSON.stringify(body.tracks)
    if (body.assets !== undefined) updateData.assets = JSON.stringify(body.assets)

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
