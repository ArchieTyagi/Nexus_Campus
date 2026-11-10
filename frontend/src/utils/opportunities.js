export const SESSION_KINDS = {
  open_source: 'Open source',
  workshop: 'Workshop',
  talk: 'Talk',
  placement: 'Placement',
  other: 'Other',
}

export const MODES = { remote: 'Remote', onsite: 'Onsite', hybrid: 'Hybrid' }

// Days until a date-only deadline, counting today as 0
export function daysLeft(deadline) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  const day = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.round((day - today) / 86400000)
}

export function deadlineLabel(deadline) {
  const d = new Date(deadline)
  const date = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
  const left = daysLeft(deadline)
  if (left < 0) return `Closed on ${date}`
  if (left === 0) return `Apply by today, ${date}`
  if (left === 1) return `Apply by tomorrow, ${date}`
  return `Apply by ${date} · ${left} days left`
}

export function isLive(session) {
  const start = new Date(session.startsAt).getTime()
  return Date.now() >= start - 10 * 60000 && Date.now() <= start + (session.minutes || 60) * 60000
}
