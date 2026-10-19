// The college minimum attendance
export const MINIMUM = 0.75

export function isLow(percent) {
  return percent < MINIMUM * 100
}

// What a student needs to hear about one subject
export function attendanceAdvice(attended, total) {
  const percent = Math.round((attended / total) * 100)
  const ok = attended / total >= MINIMUM

  if (ok) {
    const canMiss = Math.floor(attended / MINIMUM - total)
    const message =
      canMiss > 0
        ? `You can miss ${canMiss} more ${canMiss === 1 ? 'class' : 'classes'}`
        : 'Attend every class to stay above 75%'
    return { percent, ok, message }
  }

  const needed = Math.ceil((MINIMUM * total - attended) / (1 - MINIMUM))
  return { percent, ok, message: `Attend the next ${needed} classes to reach 75%` }
}
