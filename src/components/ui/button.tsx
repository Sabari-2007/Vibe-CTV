'use client'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  className?: string
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
}: ButtonProps) {
  const base = 'px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed'

  const variants: Record<string, string> = {
    primary: 'bg-accent text-white hover:brightness-110',
    secondary: 'bg-white text-ink border border-muted hover:border-ink/20',
    ghost: 'text-ink-light hover:text-ink hover:bg-muted/50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
