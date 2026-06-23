'use client'

interface LabelProps {
  children: React.ReactNode
  className?: string
}

export function Label({ children, className = '' }: LabelProps) {
  return (
    <span className={`text-sm font-medium text-slate ${className}`}>
      {children}
    </span>
  )
}
