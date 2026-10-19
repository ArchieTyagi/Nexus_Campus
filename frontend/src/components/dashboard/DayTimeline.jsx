// Today's periods laid out on a 9:00 to 16:00 strip, with a line at the current time
const DAY_START = 9 * 60
const DAY_END = 16 * 60

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function percentOfDay(minutes) {
  return ((minutes - DAY_START) / (DAY_END - DAY_START)) * 100
}

function periodState(period, now) {
  if (period.kind === 'break') return 'break'
  if (toMinutes(period.end) <= now) return 'done'
  if (toMinutes(period.start) <= now) return 'now'
  return 'next'
}

const hours = [9, 10, 11, 12, 13, 14, 15, 16]

export default function DayTimeline({ periods, now }) {
  const nowMinutes = toMinutes(now)
  const showNow = nowMinutes >= DAY_START && nowMinutes <= DAY_END

  return (
    <div className="timeline">
      <div className="timeline__track">
        <div className="timeline__rail" />

        {periods.map((period) => {
          const start = toMinutes(period.start)
          const end = toMinutes(period.end)
          const state = periodState(period, nowMinutes)
          return (
            <div
              key={period.start}
              className={`timeline__block is-${state}`}
              style={{
                left: `calc(${percentOfDay(start)}% + 3px)`,
                width: `calc(${percentOfDay(end) - percentOfDay(start)}% - 6px)`,
              }}
            >
              <span className="timeline__small">{period.label ?? `${period.start} to ${period.end}`}</span>
              <span className="timeline__title">{period.title}</span>
              <span className="timeline__small">{period.place}</span>
            </div>
          )
        })}

        {showNow && (
          <>
            <div className="timeline__now" style={{ left: `${percentOfDay(nowMinutes)}%` }} aria-hidden="true" />
            <span className="timeline__now-label" style={{ left: `${percentOfDay(nowMinutes)}%` }}>
              Now {now}
            </span>
          </>
        )}

        {hours.map((hour, index) => (
          <span
            key={hour}
            className={`timeline__tick ${index === 0 ? 'is-first' : ''} ${index === hours.length - 1 ? 'is-last' : ''}`}
            style={{ left: `${percentOfDay(hour * 60)}%` }}
          >
            {hour}:00
          </span>
        ))}
      </div>
    </div>
  )
}
