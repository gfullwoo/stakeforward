import { useEffect, type ReactNode } from 'react'
import type { Agreement } from '../types'
import { STATUS_LABEL, summarize } from '../lib/calc'

export function StatusPill({ a }: { a: Agreement }) {
  const s = summarize(a)
  if (a.status === 'active' && s.overdue > 0) return <span className="pill overdue">Payment overdue</span>
  const cls =
    a.status === 'active' ? 'active' : a.status === 'proposed' ? 'proposed' : a.status === 'draft' ? 'draft' : ''
  return <span className={`pill ${cls}`}>{STATUS_LABEL[a.status]}</span>
}

export function Bar({ value, tone }: { value: number; tone?: 'ember' }) {
  return (
    <div className={`bar ${tone ?? ''}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(2, value * 100)}%` }} />
    </div>
  )
}

export function Stat({ label, value, sub, warn }: { label: string; value: ReactNode; sub?: ReactNode; warn?: boolean }) {
  return (
    <div className={`card stat ${warn ? 'warn' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
