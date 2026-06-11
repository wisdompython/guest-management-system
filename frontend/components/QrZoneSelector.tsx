'use client'

import ZoneSelector, { Zone } from './ZoneSelector'

export type QrZone = Zone
export type { Zone }

interface Props {
  imageUrl: string
  zone: QrZone | null
  onChange: (zone: QrZone | null) => void
}

export default function QrZoneSelector({ imageUrl, zone, onChange }: Props) {
  return (
    <ZoneSelector
      imageUrl={imageUrl}
      zone={zone}
      onChange={onChange}
      label="QR Zone"
      color="indigo"
      borderColor="#6366f1"
      bgColor="rgba(99,102,241,0.10)"
      dotColor="#6366f1"
    />
  )
}
