// What each person sees in batch dropdowns: a batch manager the batches they manage,
// an HOD the batches of their department, everyone else every batch the server sends.
export function onlyMine(batches, user, profile) {
  if (user?.role === 'batch_manager') return batches.filter((b) => String(b.manager) === String(user._id))
  if (user?.role === 'hod') {
    const dept = profile?.department?._id ?? profile?.department
    return batches.filter((b) => String(b.department?._id ?? b.department) === String(dept))
  }
  return batches
}

// An HOD only works with their own department
export function myDepartments(departments, user, profile) {
  if (user?.role !== 'hod') return departments
  const dept = profile?.department?._id ?? profile?.department
  return departments.filter((d) => String(d._id) === String(dept))
}

export const isBatchManager = (user) => user?.role === 'batch_manager'
export const isHod = (user) => user?.role === 'hod'

// Admin can change anything. Others only what they posted themselves.
export function canEdit(item, user) {
  if (user?.role === 'admin') return true
  const by = item?.postedBy?._id ?? item?.postedBy
  return Boolean(by) && String(by) === String(user?._id)
}
