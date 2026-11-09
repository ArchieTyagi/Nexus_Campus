// Groups material by subject, subjects A to Z, newest file first inside each
export function groupBySubject(list) {
  const groups = new Map()
  for (const item of list) {
    if (!groups.has(item.subject)) groups.set(item.subject, [])
    groups.get(item.subject).push(item)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}
