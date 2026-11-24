import { useCallback, useEffect, useRef, useState } from 'react'

/*
 * ProductTour - a small guided-tour overlay for LearnLocal.
 *
 * Pattern: the page dims, a spotlight glides to the target element, and a
 * tooltip floats beside it. Steps are plain data:
 *   [{ target: '[data-tour="..."]', title, content, placement }]
 * placement is one of 'top', 'bottom', 'left', 'right', 'center'.
 * A step without a target (or whose target is not on screen) is shown
 * centered with the whole page dimmed.
 *
 * Usage mirrors a typical tour API:
 *   const tour = useProductTour(steps, { storageKey, autoStart: true })
 *   <button onClick={tour.start}>Replay tour</button>
 *   <ProductTour {...tour.props} />
 *
 * Keyboard: Esc closes, arrow keys move between steps. The tooltip takes
 * focus when it opens. With prefers-reduced-motion the spotlight and
 * tooltip jump straight to place instead of gliding.
 */

const GAP = 14
const VIEWPORT_PAD = 12
const TOOLTIP_WIDTH = 320

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function useProductTour(steps, { storageKey = null, autoStart = false, autoStartDelay = 900 } = {}) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const seen = useCallback(() => {
    if (!storageKey) return true
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch (_) {
      return true
    }
  }, [storageKey])

  const start = useCallback(() => {
    setIndex(0)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, '1')
      } catch (_) { /* storage unavailable: tour simply shows again next time */ }
    }
  }, [storageKey])

  const next = useCallback(() => {
    if (index >= steps.length - 1) close()
    else setIndex(index + 1)
  }, [index, steps.length, close])

  const back = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  useEffect(() => {
    if (!autoStart || seen()) return undefined
    const id = setTimeout(() => {
      setIndex(0)
      setOpen(true)
    }, autoStartDelay)
    return () => clearTimeout(id)
  }, [autoStart, autoStartDelay, seen])

  return {
    start,
    close,
    isOpen: open,
    props: { steps, open, index, onClose: close, onNext: next, onBack: back },
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function ProductTour({ steps, open, index, onClose, onNext, onBack }) {
  const reducedMotion = usePrefersReducedMotion()
  const tooltipRef = useRef(null)
  const [rect, setRect] = useState(null)
  const [tooltipSize, setTooltipSize] = useState({ width: TOOLTIP_WIDTH, height: 210 })

  const step = steps && steps.length ? steps[Math.min(index, steps.length - 1)] : null

  // Track the target element: scroll it into view, then keep measuring so
  // the spotlight follows layout shifts (data loading, window resizes).
  useEffect(() => {
    if (!open || !step) return undefined
    let cancelled = false

    const measure = () => {
      if (cancelled || !step.target) {
        if (!cancelled) setRect(null)
        return
      }
      const el = document.querySelector(step.target)
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      if ((r.width === 0 && r.height === 0) || r.bottom < 0 || r.top > window.innerHeight) {
        setRect(null)
        return
      }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    if (step.target) {
      const el = document.querySelector(step.target)
      if (el) {
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
      }
    }
    measure()
    const settle = setTimeout(measure, reducedMotion ? 40 : 340)
    const interval = setInterval(measure, 400)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelled = true
      clearTimeout(settle)
      clearInterval(interval)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, index, step, reducedMotion])

  // Keep the tooltip's measured size for positioning.
  useEffect(() => {
    if (!open || !tooltipRef.current) return
    const el = tooltipRef.current
    setTooltipSize({ width: el.offsetWidth || TOOLTIP_WIDTH, height: el.offsetHeight || 210 })
  }, [open, index, rect])

  // Focus the tooltip whenever a step opens.
  useEffect(() => {
    if (!open) return undefined
    const id = setTimeout(() => {
      if (tooltipRef.current) tooltipRef.current.focus()
    }, 60)
    return () => clearTimeout(id)
  }, [open, index])

  // Keyboard controls.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowRight') onNext()
      else if (event.key === 'ArrowLeft') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, onNext, onBack])

  if (!open || !step) return null

  const placement = step.placement || (step.target ? 'bottom' : 'center')
  const centered = placement === 'center' || !rect

  let tooltipStyle
  if (centered) {
    tooltipStyle = {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
  } else {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = tooltipSize.width
    const h = tooltipSize.height
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    let left
    let top
    if (placement === 'right') {
      left = rect.left + rect.width + GAP
      top = centerY - h / 2
      if (left + w > vw - VIEWPORT_PAD) left = rect.left - GAP - w
    } else if (placement === 'left') {
      left = rect.left - GAP - w
      top = centerY - h / 2
      if (left < VIEWPORT_PAD) left = rect.left + rect.width + GAP
    } else if (placement === 'top') {
      left = centerX - w / 2
      top = rect.top - GAP - h
      if (top < VIEWPORT_PAD) top = rect.top + rect.height + GAP
    } else {
      left = centerX - w / 2
      top = rect.top + rect.height + GAP
      if (top + h > vh - VIEWPORT_PAD) top = rect.top - GAP - h
    }
    tooltipStyle = {
      left: clamp(left, VIEWPORT_PAD, Math.max(VIEWPORT_PAD, vw - w - VIEWPORT_PAD)),
      top: clamp(top, VIEWPORT_PAD, Math.max(VIEWPORT_PAD, vh - h - VIEWPORT_PAD)),
    }
  }

  const glide = reducedMotion ? 'none' : undefined

  return (
    <div className="product-tour">
      <div
        className="product-tour-backdrop"
        style={rect ? undefined : { background: 'rgba(24, 15, 8, 0.58)' }}
      />
      {rect && (
        <div
          className="product-tour-spotlight"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            transition: glide,
          }}
        />
      )}
      <div
        className="product-tour-tooltip"
        ref={tooltipRef}
        tabIndex={-1}
        role="dialog"
        aria-label={step.title}
        style={{ ...tooltipStyle, transition: glide }}
      >
        <div className="product-tour-count">Step {index + 1} of {steps.length}</div>
        <h3 className="product-tour-title">{step.title}</h3>
        <p className="product-tour-content">{step.content}</p>
        <div className="product-tour-progress" aria-hidden="true">
          <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="product-tour-actions">
          <button type="button" className="product-tour-skip" onClick={onClose}>
            Skip
          </button>
          <span className="product-tour-nav">
            {index > 0 && (
              <button type="button" className="product-tour-btn" onClick={onBack}>
                Back
              </button>
            )}
            <button type="button" className="product-tour-btn primary" onClick={onNext}>
              {index >= steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

export default ProductTour
