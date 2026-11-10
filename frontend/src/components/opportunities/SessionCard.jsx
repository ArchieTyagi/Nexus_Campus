import { SESSION_KINDS, isLive } from '../../utils/opportunities.js'

export default function SessionCard({ session, actions = null }) {
  const d = new Date(session.startsAt)
  const live = isLive(session)
  const end = new Date(d.getTime() + (session.minutes || 60) * 60000)
  const time = (x) => x.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  return (
    <article className={`event session ${live ? 'is-live' : ''}`}>
      <span className="event__date" aria-hidden="true">
        <strong>{d.getDate()}</strong>
        {d.toLocaleDateString('en-IN', { month: 'short' })}
      </span>
      <div className="event__body">
        <span className="event__type">
          {SESSION_KINDS[session.kind]}
          {live && <span className="live-dot"> · Live now</span>}
        </span>
        <div className="event__title">{session.title}</div>
        <div className="event__meta">
          {d.toLocaleDateString('en-IN', { weekday: 'long' })}, {time(d)} to {time(end)}
          {session.speaker && ` · ${session.speaker}`}
          {session.place && ` · ${session.place}`}
        </div>
        {session.details && <p className="event__details">{session.details}</p>}
      </div>
      <div className="event__actions">
        {session.link && (
          <a className={`btn ${live ? 'btn--primary' : 'btn--outline'}`} href={session.link} target="_blank" rel="noreferrer">
            {live ? 'Join now' : 'Join link'}
          </a>
        )}
        {actions}
      </div>
    </article>
  )
}
