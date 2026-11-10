export const EVENT_LABELS = { viva: 'Viva', meeting: 'Meeting', deadline: 'Deadline' }

export const UPDATE_STATUS = {
  submitted: { label: 'Waiting for review', chip: 'pending' },
  needs_changes: { label: 'Needs changes', chip: 'rejected' },
  reviewed: { label: 'Reviewed', chip: 'approved' },
}

// "2026-11" -> "November 2026"
export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function eventTime(value) {
  return new Date(value).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}
