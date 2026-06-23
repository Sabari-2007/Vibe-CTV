import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/navbar'
import { GlobalFooter } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'Vibe — CTV Advertising Platform',
  description: 'Programmatic CTV advertising platform with real-time analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          {children}
        </main>
        <GlobalFooter />
      </body>
    </html>
  )
}
