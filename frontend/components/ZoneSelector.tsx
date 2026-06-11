'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

export interface Zone {
  x: number  // left edge as fraction of image width (0.0–1.0)
  y: number  // top edge as fraction of image height
  w: number  // width as fraction
  h: number  // height as fraction
}

interface Props {
  imageUrl: string
  zone: Zone | null
  onChange: (zone: Zone | null) => void
  label: string          // e.g. "QR Zone" or "Name Zone"
  color: string          // Tailwind color key used for overlay, e.g. "indigo" or "emerald"
  borderColor: string    // CSS color for the overlay border
  bgColor: string        // CSS color for the overlay fill
  dotColor: string       // CSS color for corner dots
}

interface Rect { left: number; top: number; width: number; height: number }

export default function ZoneSelector({
  imageUrl, zone, onChange, label, borderColor, bgColor, dotColor,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement>(null)
  const [imgRect, setImgRect]       = useState<Rect | null>(null)
  const [dragging, setDragging]     = useState(false)
  const [dragStart, setDragStart]   = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)

  const updateImgRect = useCallback(() => {
    const img = imgRef.current
    const container = containerRef.current
    if (!img || !container) return
    const cr = container.getBoundingClientRect()
    const ir = img.getBoundingClientRect()
    setImgRect({ left: ir.left - cr.left, top: ir.top - cr.top, width: ir.width, height: ir.height })
  }, [])

  useEffect(() => {
    window.addEventListener('resize', updateImgRect)
    return () => window.removeEventListener('resize', updateImgRect)
  }, [updateImgRect])

  function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
  function toFraction(px: number, origin: number, size: number) {
    return clamp((px - origin) / size, 0, 1)
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const cr = containerRef.current!.getBoundingClientRect()
    const pos = { x: e.clientX - cr.left, y: e.clientY - cr.top }
    setDragging(true); setDragStart(pos); setDragCurrent(pos)
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const cr = containerRef.current!.getBoundingClientRect()
    setDragCurrent({ x: e.clientX - cr.left, y: e.clientY - cr.top })
  }
  function onMouseUp() {
    if (!dragging || !dragStart || !dragCurrent || !imgRect) { setDragging(false); return }
    const x1 = toFraction(Math.min(dragStart.x, dragCurrent.x), imgRect.left, imgRect.width)
    const y1 = toFraction(Math.min(dragStart.y, dragCurrent.y), imgRect.top,  imgRect.height)
    const x2 = toFraction(Math.max(dragStart.x, dragCurrent.x), imgRect.left, imgRect.width)
    const y2 = toFraction(Math.max(dragStart.y, dragCurrent.y), imgRect.top,  imgRect.height)
    const w = x2 - x1; const h = y2 - y1
    if (w > 0.01 && h > 0.01) onChange({ x: x1, y: y1, w, h })
    setDragging(false); setDragStart(null); setDragCurrent(null)
  }

  function zoneToPixels(z: Zone): React.CSSProperties {
    if (!imgRect) return {}
    return {
      left:   imgRect.left + z.x * imgRect.width,
      top:    imgRect.top  + z.y * imgRect.height,
      width:  z.w * imgRect.width,
      height: z.h * imgRect.height,
    }
  }
  function dragToPixels(): React.CSSProperties {
    if (!dragging || !dragStart || !dragCurrent) return {}
    return {
      left:   Math.min(dragStart.x, dragCurrent.x),
      top:    Math.min(dragStart.y, dragCurrent.y),
      width:  Math.abs(dragCurrent.x - dragStart.x),
      height: Math.abs(dragCurrent.y - dragStart.y),
    }
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border cursor-crosshair select-none"
        style={{ borderColor: 'var(--line)' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Design template"
          className="w-full block"
          onLoad={updateImgRect}
          draggable={false}
        />

        {/* Saved zone overlay */}
        {zone && imgRect && (
          <div
            className="absolute pointer-events-none"
            style={{ ...zoneToPixels(zone), border: `2px solid ${borderColor}`, background: bgColor }}
          >
            {[['top-0 left-0'], ['top-0 right-0'], ['bottom-0 left-0'], ['bottom-0 right-0']].map(([pos], i) => (
              <div key={i} className={`absolute ${pos} w-2 h-2 -translate-x-0.5 -translate-y-0.5 rounded-sm`}
                style={{ background: dotColor }} />
            ))}
            <span className="absolute top-1 left-1 text-[10px] font-bold px-1 py-0.5 rounded leading-tight"
              style={{ background: 'rgba(255,255,255,0.9)', color: dotColor }}>
              {label}
            </span>
          </div>
        )}

        {/* Active drag overlay */}
        {dragging && (
          <div
            className="absolute pointer-events-none"
            style={{ ...dragToPixels(), border: `2px dashed ${borderColor}`, background: bgColor }}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        {zone ? (
          <p className="font-mono text-xs" style={{ color: 'var(--muted-2)' }}>
            x:{(zone.x * 100).toFixed(1)}% y:{(zone.y * 100).toFixed(1)}%
            &nbsp;w:{(zone.w * 100).toFixed(1)}% h:{(zone.h * 100).toFixed(1)}%
          </p>
        ) : (
          <p className="text-xs" style={{ color: 'var(--muted-2)' }}>Drag on the image to define the {label.toLowerCase()}</p>
        )}
        {zone && (
          <button type="button" onClick={() => onChange(null)}
            className="text-xs font-semibold text-red-400 hover:text-red-600 transition">
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
