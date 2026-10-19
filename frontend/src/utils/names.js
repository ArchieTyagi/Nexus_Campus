export function initials(name) {
  return name
    .replace(/^(Dr|Prof|Ms|Mr)\.?\s+/i, '')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
