// Who a notice is for, in words
export function audienceLabel(notice) {
  if (notice.audience === 'batch') return `${notice.department?.code ?? ''} ${notice.batch?.name ?? 'batch'}`.trim()
  if (notice.audience === 'department') return notice.department?.name ?? 'Department'
  return 'Whole college'
}
