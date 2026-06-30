'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface TourStep {
  /** Matches a data-tour="..." attribute on the target element */
  target: string
  title: string
  body: string
  /** Page the target lives on. If different from the current page, the tour navigates there first. */
  path: string
  /** Where to place the tooltip relative to the target */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export interface Tour {
  id: string
  steps: TourStep[]
}

interface Rect { top: number; left: number; width: number; height: number }

interface TourContextValue {
  activeTour: Tour | null
  stepIndex: number
  start: (tour: Tour) => void
  stop: () => void
  next: () => void
  back: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within TourProvider')
  return ctx
}

const PAD = 8

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTour, setActiveTour] = useState<Tour | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const navigatingRef = useRef(false)

  const step = activeTour?.steps[stepIndex] ?? null

  const start = useCallback((tour: Tour) => {
    setActiveTour(tour)
    setStepIndex(0)
  }, [])

  const stop = useCallback(() => {
    setActiveTour(null)
    setStepIndex(0)
    setRect(null)
  }, [])

  const next = useCallback(() => {
    setActiveTour((t) => {
      if (!t) return t
      setStepIndex((i) => Math.min(i + 1, t.steps.length - 1))
      return t
    })
  }, [])

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  // Navigate to the right page when the current step lives elsewhere.
  useEffect(() => {
    if (!step) return
    if (pathname !== step.path) {
      navigatingRef.current = true
      router.push(step.path)
    }
  }, [step, pathname, router])

  // Locate and track the target element's position.
  useEffect(() => {
    if (!step || pathname !== step.path) { setRect(null); return }
    navigatingRef.current = false

    let raf = 0
    function measure() {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step!.target}"]`)
      if (!el) { setRect(null); raf = requestAnimationFrame(measure); return }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    measure()

    function onScrollOrResize() { measure() }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [step, pathname])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!activeTour) return
      if (e.key === 'Escape') stop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTour, stop])

  return (
    <TourContext.Provider value={{ activeTour, stepIndex, start, stop, next, back }}>
      {children}
      {activeTour && step && <TourOverlay rect={rect} step={step} stepIndex={stepIndex} total={activeTour.steps.length} onNext={next} onBack={back} onClose={stop} />}
    </TourContext.Provider>
  )
}

function TourOverlay({
  rect, step, stepIndex, total, onNext, onBack, onClose,
}: {
  rect: Rect | null
  step: TourStep
  stepIndex: number
  total: number
  onNext: () => void
  onBack: () => void
  onClose: () => void
}) {
  const isFirst = stepIndex === 0
  const isLast = stepIndex === total - 1
  const placement = step.placement ?? 'bottom'

  const tooltipStyle = (() => {
    if (!rect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } as React.CSSProperties
    }
    const base: React.CSSProperties = { position: 'fixed' }
    if (placement === 'bottom') return { ...base, top: rect.top + rect.height + 14, left: Math.max(12, rect.left) }
    if (placement === 'top')    return { ...base, top: Math.max(12, rect.top - 14), left: Math.max(12, rect.left), transform: 'translateY(-100%)' }
    if (placement === 'left')   return { ...base, top: rect.top, left: Math.max(12, rect.left - 14), transform: 'translateX(-100%)' }
    return { ...base, top: rect.top, left: rect.left + rect.width + 14 }
  })()

  return (
    <>
      {/* Dimmed backdrop with a cutout via box-shadow trick */}
      <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
        {rect ? (
          <div
            className="absolute rounded-lg transition-all duration-200"
            style={{
              top: rect.top - PAD, left: rect.left - PAD,
              width: rect.width + PAD * 2, height: rect.height + PAD * 2,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
              border: '2px solid var(--brand)',
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)' }} />
        )}
      </div>

      {/* Click-catcher to allow closing via backdrop, doesn't block the spotlighted element */}
      <div className="fixed inset-0 z-[100]" onClick={onClose} />

      {/* Tooltip */}
      <div
        className="z-[101] w-[300px] rounded-xl p-4 shadow-2xl"
        style={{ ...tooltipStyle, background: 'var(--panel)', border: '1px solid var(--line)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--brand)' }}>
            Step {stepIndex + 1} of {total}
          </p>
          <button onClick={onClose} className="flex-shrink-0 text-xs transition hover:opacity-70" style={{ color: 'var(--muted)' }}>✕</button>
        </div>
        <p className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{step.title}</p>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{step.body}</p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className="h-1.5 rounded-full transition-all"
                style={{ width: i === stepIndex ? '14px' : '5px', background: i === stepIndex ? 'var(--brand)' : 'var(--line)' }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={onBack} className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
                Back
              </button>
            )}
            <button onClick={isLast ? onClose : onNext}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--brand)' }}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
