'use client'

import { RefObject } from 'react'
import { DualZoneCanvas, ZoneLegendItem, ZoneWarning } from '@/components/PassDesignPanel'
import type { Zone } from '@/components/PassDesignPanel'
import { Event } from '@/lib/api'
import { QrBgColorPicker } from './QrBgColorPicker'

const field = 'w-full rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted-2)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

interface Props {
  event?: Event | null
  newFileChosen?: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  previewUrl: string | null
  qrZone: Zone | null
  nameZone: Zone | null
  qrBgColor: string
  fontColor?: string
  fontSizeFrac?: number
  fontName?: string
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onQrChange: (z: Zone | null) => void
  onNameChange: (z: Zone | null) => void
  onQrBgColorChange: (color: string) => void
  isEdit?: boolean
}

export function PassDesignSection({
  event, newFileChosen, fileInputRef, previewUrl,
  qrZone, nameZone, qrBgColor,
  fontColor, fontSizeFrac, fontName,
  onFileChange, onQrChange, onNameChange, onQrBgColorChange,
  isEdit = false,
}: Props) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
      <div className="border-b border-[rgba(255,255,255,0.07)] px-6 py-4">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Pass Design & Zones</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {isEdit
            ? 'Leave the file picker empty to keep the existing design.'
            : 'Upload your design, then drag to mark the QR code area and the guest name area.'}
        </p>
      </div>
      <div className="space-y-5 p-6">
        {isEdit && event?.design_template && !newFileChosen && (
          <div className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Current:</span>
            <a href={event.design_template} target="_blank" rel="noopener noreferrer"
              className="truncate text-xs font-semibold text-[var(--brand)] hover:underline">
              {event.design_template.split('/').pop()}
            </a>
          </div>
        )}
        <div>
          <label className={label}>
            {isEdit ? (newFileChosen ? 'New Design File' : 'Replace Design (PNG / JPG)') : 'Design Template (PNG / JPG)'}
          </label>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={onFileChange}
            className="w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--brand)] file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--brand-strong)]" />
        </div>
        {previewUrl && (
          <>
            <div className="flex flex-wrap gap-3 text-xs">
              <ZoneLegendItem color="#6366f1" label="QR Zone" set={!!qrZone} />
              <ZoneLegendItem color="#10b981" label="Name Zone" set={!!nameZone} />
            </div>
            <DualZoneCanvas imageUrl={previewUrl} qrZone={qrZone} onQrChange={onQrChange}
              nameZone={nameZone} onNameChange={onNameChange}
              fontColor={fontColor} fontSizeFrac={fontSizeFrac} fontName={fontName} />
            {!qrZone && <ZoneWarning>No QR zone — will fall back to bottom-right corner.</ZoneWarning>}
            {!nameZone && <ZoneWarning>No name zone — guest name will not be printed on the pass.</ZoneWarning>}
          </>
        )}
        {isEdit && <QrBgColorPicker qrBgColor={qrBgColor} onChange={onQrBgColorChange} />}
      </div>
    </div>
  )
}
