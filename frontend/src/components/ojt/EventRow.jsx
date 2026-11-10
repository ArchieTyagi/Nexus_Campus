import { EVENT_LABELS } from '../../utils/ojt.js'

// One viva / meeting / deadline with a date block on the left
export default function EventRow({ event, actions = null }) {
  const d = new Date(event.startsAt)
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  return (
    <div className={`event event--${event.type}`}>
      <span className="event__date" aria-hidden="true">
        <strong>{d.getDate()}</strong>
        {d.toLocaleDateString('en-IN', { month: 'short' })}
      </span>
      <div className="event__body">
        <span className="event__type">{EVENT_LABELS[event.type]}</span>
        <div className="event__title">{event.title}</div>
        <div className="event__meta">
          {d.toLocaleDateString('en-IN', { weekday: 'long' })}, {time}
          {event.place && ` · ${event.place}`}
        </div>
        {event.details && <p className="event__details">{event.details}</p>}
      </div>
      <div className="event__actions">
        {event.link && (
          <a className="btn btn--outline" href={event.link} target="_blank" rel="noreferrer">
            Join
          </a>
        )}
        {actions}
      </div>
    </div>
  )
}
