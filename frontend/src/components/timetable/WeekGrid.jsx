const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' }

// Today's short name in India time, like "Mon"
const todayShort = () => new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' })

// A week laid out Monday to Saturday, one column per day.
// show: which extra line to print under the course ("teacher" or "batch").
// renderActions(slot) lets the admin page add Edit / Delete buttons to each class.
export default function WeekGrid({ slots, show = 'teacher', selectedId, renderActions }) {
  const today = todayShort()
  return (
    <div className="week">
      {DAYS.map((day) => {
        const list = slots.filter((s) => s.day === day)
        return (
          <section key={day} className={`week__day ${day === today ? 'is-today' : ''}`} aria-label={DAY_NAMES[day]}>
            <h3 className="week__name">
              {DAY_NAMES[day]}
              {day === today && <span className="week__today">Today</span>}
            </h3>
            {list.length === 0 && <p className="week__empty">No classes</p>}
            {list.map((s) => (
              <article key={s._id} className={`slot ${selectedId === s._id ? 'is-selected' : ''}`}>
                <span className="slot__time">
                  {s.startTime} to {s.endTime}
                </span>
                <span className="slot__code">{s.course?.code}</span>
                <span className="slot__name">{s.course?.name}</span>
                <span className="slot__meta">
                  {show === 'batch' ? s.batch?.name : (s.teacher?.user?.name ?? 'No teacher')}
                  {s.room && ` · ${s.room}`}
                </span>
                {renderActions && <span className="slot__actions">{renderActions(s)}</span>}
              </article>
            ))}
          </section>
        )
      })}
    </div>
  )
}
