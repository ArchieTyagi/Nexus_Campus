import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import Panel from '../components/ui/Panel.jsx'
import Icon from '../components/ui/Icon.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationButton from '../components/ui/NotificationButton.jsx'
import DayTimeline from '../components/dashboard/DayTimeline.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'
import { isLow } from '../utils/attendance.js'
import { greeting, todayLabel } from '../utils/date.js'
import { initials } from '../utils/names.js'

const WATCH_SHOWN = 8

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
const clock = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
const shortDay = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const takenText = (taken) => `Marked, ${taken.present} of ${taken.total} present`

// The big card at the top: a running QR session first, then the class on now, then the next one
function focusCard(data) {
  if (data.openSession) {
    return {
      pill: `Attendance is open until ${clock(data.openSession.endsAt)}`,
      title: `${data.openSession.course} attendance is running`,
      detail: 'Students can still scan. Open it to show the QR again or mark someone by hand.',
      action: { to: `/teacher/attendance?session=${data.openSession._id}`, label: 'Open attendance' },
    }
  }
  const mins = toMinutes(data.now)
  const current = data.today.find((p) => toMinutes(p.start) <= mins && mins < toMinutes(p.end))
  const next = data.today.find((p) => toMinutes(p.start) > mins)
  const slot = current ?? next
  if (!slot) return null
  return {
    pill: current ? `In class now, ends at ${slot.end}` : `Next class at ${slot.start}`,
    title: `${slot.label} · ${slot.title}`,
    detail: `${slot.place || 'Room not set'}. ${slot.taken ? `${takenText(slot.taken)}.` : 'Attendance is not taken yet.'}`,
    // Taking it again would count as one more class held, so only offer it when it is not taken yet
    action: slot.taken ? null : { to: `/teacher/attendance?course=${slot.course}`, label: 'Mark attendance' },
  }
}

export default function TeacherDashboard() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/dashboard/teacher', { token })
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token])

  if (error) {
    return (
      <p className="login__error" role="alert">
        {error}
      </p>
    )
  }
  if (!data) return <div className="auth-loading">Loading your day...</div>

  const firstName = data.me.name.split(' ')[0]
  const mins = toMinutes(data.now)
  const left = data.today.filter((p) => toMinutes(p.end) > mins)
  const card = focusCard(data)

  const stats = [
    {
      label: 'Classes today',
      value: String(data.stats.classesToday),
      note: left.length ? `${left.length} still to go` : data.stats.classesToday ? 'all done' : 'no classes',
    },
    { label: 'Your courses', value: String(data.stats.courses), note: `${data.stats.students} students` },
    {
      label: 'Below 75%',
      value: String(data.stats.below),
      note: data.stats.below ? 'students to follow up' : 'everyone is fine',
      tone: data.stats.below ? 'red' : undefined,
    },
  ]

  // On the day strip, show whether attendance was taken for each class
  const periods = data.today.map((p) => ({
    ...p,
    place: p.taken ? `Marked ${p.taken.present}/${p.taken.total}` : p.place,
  }))

  return (
    <>
      <PageHeader
        kicker={todayLabel()}
        title={`${greeting()}, ${firstName}`}
        subtitle={[data.me.department, data.me.employeeId].filter(Boolean).join(' · ')}
        stats={stats}
        actions={
          <>
            <Link to="/teacher/notices" aria-label={`Notices, ${data.unreadNotices} new`}>
              <NotificationButton unread={data.unreadNotices} />
            </Link>
            <Avatar name={data.me.name} detail={data.me.employeeId} />
          </>
        }
      />

      {card && (
        <section className="live-class">
          <div>
            <span className="pill live-class__pill">
              <span className="pill__dot" aria-hidden="true" />
              {card.pill}
            </span>
            <h2 className="live-class__title">{card.title}</h2>
            <p className="live-class__meta">{card.detail}</p>
          </div>
          {card.action && (
            <Link to={card.action.to} className="btn btn--primary btn--large">
              <Icon name="checklist" strokeWidth={2} />
              {card.action.label}
            </Link>
          )}
        </section>
      )}

      <Panel
        title="Your day"
        action={
          <Link to="/teacher/timetable" className="panel__link">
            Full week
          </Link>
        }
      >
        {data.today.length === 0 ? (
          <p className="empty-note">No classes in your timetable today.</p>
        ) : (
          <DayTimeline periods={periods} now={data.now} />
        )}
      </Panel>

      <div className="columns">
        <div className="column column--wide">
          <Panel
            title="Students to watch"
            description={
              data.watch.length ? 'Below 75% in one of your courses, lowest first.' : 'Nobody is below 75% right now.'
            }
          >
            {data.watch.slice(0, WATCH_SHOWN).map((s) => (
              <div className="list-row" key={`${s.rollNumber}-${s.course}`}>
                <span className="person-avatar" aria-hidden="true">
                  {initials(s.name)}
                </span>
                <div className="list-row__body">
                  <div className="list-row__title">{s.name}</div>
                  <div className="list-row__meta">
                    {s.rollNumber} · {s.course}, attended {s.attended} of {s.held}
                  </div>
                </div>
                <div className="align-right">
                  <div className="text-red">{s.percent}%</div>
                  <div className="list-row__meta">
                    needs the next {s.toRecover} {s.toRecover === 1 ? 'class' : 'classes'}
                  </div>
                </div>
              </div>
            ))}
            {data.watch.length > WATCH_SHOWN && (
              <p className="empty-note">And {data.watch.length - WATCH_SHOWN} more.</p>
            )}
          </Panel>
        </div>

        <div className="column">
          <Panel title="Your courses">
            {data.courses.length === 0 && (
              <p className="empty-note">No courses are assigned to you yet. Ask the admin to assign you in Courses.</p>
            )}
            {data.courses.map((c) => (
              <Link to={`/teacher/courses?course=${c._id}`} className="list-row list-row--link" key={c._id}>
                <div className="list-row__body">
                  <div className="list-row__title">
                    {c.code} · {c.name}
                  </div>
                  <div className="list-row__meta">
                    {c.batch}, {c.students} students · {c.held} {c.held === 1 ? 'class' : 'classes'} held
                    {c.lastClass ? `, last on ${shortDay(c.lastClass)}` : ''}
                  </div>
                </div>
                <div className="align-right">
                  <div className={c.average !== null && isLow(c.average) ? 'text-red' : ''}>
                    {c.average === null ? '—' : `${c.average}%`}
                  </div>
                  <div className="list-row__meta">{c.below ? `${c.below} below 75%` : 'average'}</div>
                </div>
              </Link>
            ))}
          </Panel>

          <Panel
            title="Notices"
            action={
              <Link to="/teacher/notices" className="panel__link">
                All notices
              </Link>
            }
          >
            {data.notices.length === 0 && <p className="empty-note">No notices yet.</p>}
            {data.notices.map((notice) => (
              <div className="list-row" key={notice._id}>
                <div className="list-row__body">
                  <div className="list-row__title">
                    {notice.title}
                    {notice.important && <span className="notice__tag notice__tag--important home-tag">Important</span>}
                  </div>
                  <div className="list-row__meta">
                    From {notice.postedBy ?? 'the college'}, {shortDay(notice.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  )
}
