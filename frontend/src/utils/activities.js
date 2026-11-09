// Labels shared by the student and review pages
export const CATEGORY_LABELS = {
  hackathon: 'Hackathon',
  project: 'Project submission',
  internship: 'Internship',
  open_source: 'Open source',
  program: 'Program (Apple Academy, fellowships)',
  side_hustle: 'Side hustle',
  other: 'Other',
}

export const STAGE_LABELS = {
  registered: 'Registered',
  selected: 'Selected / submitted',
}

export const STATUS_LABELS = {
  pending: 'Waiting for review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function shortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
