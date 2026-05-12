'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

export interface QrZone {
  x: number  // left edge as fraction of image width (0.0–1.0)
  y: number  // top edge as fraction of image height
  w: number  // width as fraction
  h: number  // height as fraction
}

interface Props {
  imageUrl: string
  zone: QrZone | null
  onChange: (zone: QrZone | null) => void
}

interface Rect { left: number; top: number; width: number; height: number }

export default function QrZoneSelector({ imageUrl, zone, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgRect, setImgRect] = useState<Rect | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)

  const updateImgRect = useCallback(() => {
    const img = imgRef.current
    const container = containerRef.current
    if (!img || !container) return
    const cr = container.getBoundingClientRect()
    const ir = img.getBoundingClientRect()
    setImgRect({
      left:   ir.left - cr.left,
      top:    ir.top  - cr.top,
      width:  ir.width,
      height: ir.height,
    })
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
    setDragging(true)
    setDragStart(pos)
    setDragCurrent(pos)
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
    const w = x2 - x1
    const h = y2 - y1
    if (w > 0.01 && h > 0.01) {
      onChange({ x: x1, y: y1, w, h })
    }
    setDragging(false)
    setDragStart(null)
    setDragCurrent(null)
  }

  // Convert saved zone fractions → pixel overlay rect
  function zoneToPixels(z: QrZone): React.CSSProperties {
    if (!imgRect) return {}
    return {
      left:   imgRect.left + z.x * imgRect.width,
      top:    imgRect.top  + z.y * imgRect.height,
      width:  z.w * imgRect.width,
      height: z.h * imgRect.height,
    }
  }

  // Active drag overlay
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
        className="relative rounded-xl overflow-hidden border border-gray-200 cursor-crosshair select-none"
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
            className="absolute border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none"
            style={zoneToPixels(zone)}
          >
            {/* Corner handles */}
            {[['top-0 left-0'], ['top-0 right-0'], ['bottom-0 left-0'], ['bottom-0 right-0']].map(([pos], i) => (
              <div key={i} className={`absolute ${pos} w-2 h-2 bg-indigo-500 -translate-x-0.5 -translate-y-0.5`} />
            ))}
            <span className="absolute top-1 left-1 text-[10px] font-bold text-indigo-700 bg-white/80 px-1 rounded leading-tight">
              QR Zone
            </span>
          </div>
        )}

        {/* Active drag overlay */}
        {dragging && (
          <div
            className="absolute border-2 border-dashed border-indigo-400 bg-indigo-400/10 pointer-events-none"
            style={dragToPixels()}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        {zone ? (
          <p className="text-xs text-gray-400 font-mono">
            x:{(zone.x * 100).toFixed(1)}% y:{(zone.y * 100).toFixed(1)}%
            &nbsp;w:{(zone.w * 100).toFixed(1)}% h:{(zone.h * 100).toFixed(1)}%
          </p>
        ) : (
          <p className="text-xs text-gray-400">Drag on the image to set the QR zone</p>
        )}
        {zone && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Clear zone
          </button>
        )}
      </div>
    </div>
  )
}
