import { useEffect, useState } from 'react'

/**
 * A number field that holds a draft string while typing (so commas and partial
 * entries don't fight the user) and commits a parsed number on blur/Enter.
 * Accepts both comma and dot as decimal separator (Belgian habit).
 */
export function NumberInput({
  value,
  onCommit,
  className = 'input',
  placeholder,
  suffix,
  step
}: {
  value: number | null | undefined
  onCommit: (n: number) => void
  className?: string
  placeholder?: string
  suffix?: string
  step?: number
}): JSX.Element {
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value))

  useEffect(() => {
    setDraft(value == null ? '' : String(value))
  }, [value])

  const commit = (): void => {
    const parsed = parseFloat(draft.replace(',', '.'))
    onCommit(Number.isFinite(parsed) ? parsed : 0)
  }

  const input = (
    <input
      className={className}
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      step={step}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )

  if (!suffix) return input
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">
        {suffix}
      </span>
    </div>
  )
}
