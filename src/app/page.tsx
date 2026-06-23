import dynamic from 'next/dynamic'
import { HeroSection } from '@/components/landing/hero-section'
import { GrowthMatrix } from '@/components/landing/growth-matrix'
import { IndiaMapSection } from '@/components/landing/india-map-section'
import { BuddyWidget } from '@/components/landing/buddy-widget'

const VideoMosaic = dynamic(() => import('@/components/landing/video-mosaic').then((m) => m.VideoMosaic), { ssr: false })

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <GrowthMatrix />
      <IndiaMapSection />
      <VideoMosaic />
      <BuddyWidget />
    </>
  )
}
