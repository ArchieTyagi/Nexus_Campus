// A batch manager should only see the batches they manage in dropdowns.
// Everyone else sees every batch the server sends.
export function onlyMine(batches, user) {
  if (user?.role !== 'batch_manager') return batches
  return batches.filter((b) => String(b.manager) === String(user._id))
}

export const isBatchManager = (user) => user?.role === 'batch_manager'

// Admin can change anything. Others only what they posted themselves.
export function canEdit(item, user) {
  if (user?.role === 'admin') return true
  const by = item?.postedBy?._id ?? item?.postedBy
  return Boolean(by) && String(by) === String(user?._id)
}
