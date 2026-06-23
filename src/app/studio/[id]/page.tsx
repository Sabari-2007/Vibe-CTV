import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { StudioClient } from '@/components/studio/studio-client'

interface Props {
  params: { id: string }
}

export default async function ProjectEditorPage({ params }: Props) {
  const project = await prisma.videoProject.findUnique({
    where: { id: params.id },
  })

  if (!project) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <StudioClient />
    </div>
  )
}
