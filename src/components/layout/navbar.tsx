'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/studio', label: 'Studio' },
    { href: '/campaign/new', label: 'New Campaign' },
  ]

  useEffect(() => { setMobileOpen(false) }, [pathname])

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image src="/lumina-logo.png" alt="Lumina" width={40} height={40} className="rounded-lg" />
          <span className="text-xl font-semibold text-ink" style={{ fontFamily: "'Stack Sans Notch', sans-serif" }}>Lumina</span>
        </Link>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'text-accent' : 'text-ink-light hover:text-ink'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-accent/5 rounded-lg border border-accent/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            )
          })}
          {loading ? null : user ? (
            <div className="flex items-center gap-2 ml-3">
              <span className="text-sm text-gray-600 hidden lg:inline">{user.name || user.email}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="ml-3 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 transition-all"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 rounded-xl bg-accent text-white font-semibold text-sm hover:brightness-110 transition-all"
                style={{ boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)' }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="md:hidden border-t border-muted bg-white px-4 py-3 space-y-1"
        >
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'text-accent bg-accent/5' : 'text-ink-light hover:text-ink hover:bg-muted'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
          <div className="border-t border-muted pt-2 mt-2">
            {loading ? null : user ? (
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm text-gray-600">{user.name || user.email}</div>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-muted transition-colors">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Link href="/auth/login" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-muted transition-colors">
                  Login
                </Link>
                <Link href="/auth/register" className="block px-3 py-2 rounded-lg text-sm text-white bg-accent text-center font-semibold hover:brightness-110 transition-all">
                  Register
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  )
}
