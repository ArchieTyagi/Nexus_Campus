// Where each role lands after login (the batch manager's pages live under /batch)
const HOME = { batch_manager: '/batch' }

export function homeFor(role) {
  return HOME[role] ?? `/${role}`
}
