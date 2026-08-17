'use client'

import { RefObject } from 'react'
import { DualZoneCanvas, ZoneLegendItem, ZoneWarning } from '@/components/PassDesignPanel'
import type { Zone } from '@/components/PassDesignPanel'
import { Event } from '@/lib/api'
import { QrBgColorPicker } from './QrBgColorPicker'
import { FormSectionHeader } from '@/components/ui/FormSectionHeader'

const label = 'form-label'

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
  fontFileUrl?: string
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onQrChange: (z: Zone | null) => void
  onNameChange: (z: Zone | null) => void
  onQrBgColorChange: (color: string) => void
  isEdit?: boolean
  step?: number
}

export function PassDesignSection({
  event, newFileChosen, fileInputRef, previewUrl,
  qrZone, nameZone, qrBgColor,
  fontColor, fontSizeFrac, fontName, fontFileUrl,
  onFileChange, onQrChange, onNameChange, onQrBgColorChange,
  isEdit = false, step,
}: Props) {
  return (
    <div id="pass-design" className="form-card scroll-mt-6">
      <FormSectionHeader step={step} optional={!isEdit} tourId="event-pass-design-section" title="Pass design" description={isEdit ? 'Upload a replacement only if the design has changed.' : 'Upload a design now, or skip this and add one before sending passes.'} />
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
          <input data-tour="event-design-upload" ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={onFileChange}
            className="w-full rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--bg)] p-3 text-sm text-[var(--muted)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--brand)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-[rgba(184,150,62,0.55)] hover:file:bg-[var(--brand-strong)]" />
          <p className="form-hint">PNG or JPG, up to 5 MB. A landscape design works best.</p>
        </div>
        {previewUrl && (
          <>
            <div className="flex flex-wrap gap-3 text-xs">
              <ZoneLegendItem color="#6366f1" label="QR Zone" set={!!qrZone} />
              <ZoneLegendItem color="#10b981" label="Name Zone" set={!!nameZone} />
            </div>
            <DualZoneCanvas imageUrl={previewUrl} qrZone={qrZone} onQrChange={onQrChange}
              nameZone={nameZone} onNameChange={onNameChange}
              fontColor={fontColor} fontSizeFrac={fontSizeFrac} fontName={fontName} fontFileUrl={fontFileUrl} />
            {!qrZone && <ZoneWarning>No QR zone — will fall back to bottom-right corner.</ZoneWarning>}
            {!nameZone && <ZoneWarning>No name zone — guest name will not be printed on the pass.</ZoneWarning>}
          </>
        )}
        {isEdit && <QrBgColorPicker qrBgColor={qrBgColor} onChange={onQrBgColorChange} />}
      </div>
    </div>
  )
}
