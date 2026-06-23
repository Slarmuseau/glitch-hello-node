import React from 'react'
import { formatEuro, formatPercent } from '@shared/domain'

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function Card({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}): JSX.Element {
  return <div className={`card p-5 ${className}`}>{children}</div>
}

export function Money({ value, className = '' }: { value: number; className?: string }): JSX.Element {
  return <span className={`tabular ${className}`}>{formatEuro(value)}</span>
}

export function Percent({
  value,
  decimals = 0,
  className = ''
}: {
  value: number
  decimals?: number
  className?: string
}): JSX.Element {
  return <span className={`tabular ${className}`}>{formatPercent(value, decimals)}</span>
}

export function Stat({
  label,
  children,
  hint,
  tone = 'default'
}: {
  label: string
  children: React.ReactNode
  hint?: string
  tone?: 'default' | 'good' | 'bad'
}): JSX.Element {
  const toneClass =
    tone === 'good' ? 'text-sage-600' : tone === 'bad' ? 'text-clay-500' : 'text-ink'
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`text-2xl font-display mt-1 tabular ${toneClass}`}>{children}</div>
      {hint && <div className="text-xs text-ink-faint mt-1">{hint}</div>}
    </div>
  )
}

export function Field({
  label,
  children,
  hint
}: {
  label: string
  children: React.ReactNode
  hint?: string
}): JSX.Element {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-faint mt-1">{hint}</span>}
    </label>
  )
}

export function EmptyState({
  title,
  children
}: {
  title: string
  children?: React.ReactNode
}): JSX.Element {
  return (
    <div className="card p-10 text-center">
      <p className="text-ink font-medium">{title}</p>
      {children && <div className="text-sm text-ink-soft mt-2">{children}</div>}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral'
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'good' | 'bad' | 'amber' | 'plum'
}): JSX.Element {
  const tones: Record<string, string> = {
    neutral: 'bg-cream-deep text-ink-soft',
    good: 'bg-sage-400/15 text-sage-600',
    bad: 'bg-clay-400/15 text-clay-500',
    amber: 'bg-amber-100 text-amber-700',
    plum: 'bg-plum-400/15 text-plum-500'
  }
  return <span className={`pill ${tones[tone]}`}>{children}</span>
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}): JSX.Element | null {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 p-6 overflow-y-auto"
      onMouseDown={onClose}
    >
      <div
        className={`card p-6 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} mt-12`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-ink">{title}</h2>
          <button className="btn-ghost px-2 py-1" onClick={onClose} aria-label="Sluiten">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
