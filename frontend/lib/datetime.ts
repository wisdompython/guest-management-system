const WAT_TIME_ZONE = 'Africa/Lagos'

/** Format an instant for a datetime-local input using West Africa Time. */
export function toWatDateTimeInput(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WAT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''

  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

/** Convert a datetime-local WAT wall-clock value to an unambiguous UTC instant. */
export function watDateTimeInputToIso(value: string) {
  if (!value) return ''
  const instant = new Date(`${value}:00+01:00`)
  if (Number.isNaN(instant.getTime())) return ''
  return instant.toISOString()
}
