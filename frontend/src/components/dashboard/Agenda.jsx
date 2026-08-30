// Today's classes as a simple list: time, subject, room, and whether it is done, on now or next.
// "note" on a period (for example "Marked 6 of 8") replaces the status text.
const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function Agenda({ periods, now }) {
  const mins = toMinutes(now)
  const nextIndex = periods.findIndex((p) => toMinutes(p.start) > mins)

  return (
    <ol className="agenda">
      {periods.map((p, i) => {
        const done = toMinutes(p.end) <= mins
        const onNow = !done && toMinutes(p.start) <= mins
        const state = onNow ? 'now' : done ? 'done' : i === nextIndex ? 'next' : 'later'
        const status = { now: 'On now', done: 'Done', next: 'Next', later: '' }[state]
        return (
          <li key={`${p.start}-${p.label}`} className={`agenda__row is-${state}`}>
            <span className="agenda__time">
              {p.start}
              <span>{p.end}</span>
            </span>
            <span className="agenda__body">
              <span className="agenda__title">{p.title}</span>
              <span className="agenda__meta">{[p.label, p.place].filter(Boolean).join(', ')}</span>
            </span>
            <span className="agenda__status">{p.note ?? status}</span>
          </li>
        )
      })}
    </ol>
  )
}
