import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import Panel from '../components/ui/Panel.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationButton from '../components/ui/NotificationButton.jsx'
import DayTimeline from '../components/dashboard/DayTimeline.jsx'
import AttendanceRegister from '../components/dashboard/AttendanceRegister.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'
import { MINIMUM } from '../utils/attendance.js'
import { todayLabel } from '../utils/date.js'

const OJT_LABELS = {
  not_sent: { value: 'Not sent', tone: 'red' },
  submitted: { value: 'Sent', tone: 'amber' },
  needs_changes: { value: 'Fix it', tone: 'red' },
  reviewed: { value: 'Reviewed' },
}

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// "DSA is on now", "Next: Maths at 11:40", or "No more classes today"
function headline(firstName, today, now) {
  const mins = toMinutes(now)
  const current = today.find((p) => toMinutes(p.start) <= mins && mins < toMinutes(p.end))
  if (current) return { title: `Hi ${firstName}, ${current.title} is on now`, next: current }
  const next = today.find((p) => toMinutes(p.start) > mins)
  if (next) return { title: `Hi ${firstName}, next is ${next.title} at ${next.start}`, next }
  return { title: `Hi ${firstName}, no more classes today`, next: null }
}

const shortDate = (value) => {
  const d = new Date(value)
  return { month: d.toLocaleDateString('en-IN', { month: 'short' }), day: d.getDate() }
}

export default function StudentDashboard() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/dashboard/student', { token })
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
  const held = data.subjects.filter((s) => s.total > 0)
  const attended = held.reduce((sum, s) => sum + s.attended, 0)
  const total = held.reduce((sum, s) => sum + s.total, 0)
  const overall = total ? Math.round((attended / total) * 100) : null
  const below = held.filter((s) => s.attended / s.total < MINIMUM)
  const notStarted = data.subjects.filter((s) => s.total === 0)
  const { title, next } = headline(firstName, data.today, data.now)
  const ojt = OJT_LABELS[data.ojtUpdate]

  const stats = [
    {
      label: 'Overall attendance',
      value: overall === null ? '—' : `${overall}%`,
      note: overall === null ? 'no classes yet' : 'minimum is 75%',
      tone: overall !== null && overall < MINIMUM * 100 ? 'red' : undefined,
    },
    {
      label: 'Subjects below 75%',
      value: String(below.length),
      note: below.length ? below.map((s) => s.code).join(', ') : 'all fine',
      tone: below.length ? 'red' : undefined,
    },
    {
      label: 'Impact score',
      value: String(data.impact.score),
      note: `rank #${data.impact.rank} of ${data.impact.outOf} in your batch`,
      tone: 'amber',
    },
    { label: 'OJT update', value: ojt.value, note: 'for this month', tone: ojt.tone },
  ]

  return (
    <>
      <PageHeader
        kicker={`${todayLabel()}, semester ${data.me.semester}`}
        title={title}
        subtitle={`${data.me.batch}, ${data.me.department}.${next ? ` ${next.label}, ${next.place || 'room not set'}.` : ''}`}
        stats={stats}
        actions={
          <>
            <Link to="/student/notices" aria-label={`Notices, ${data.unreadNotices} new`}>
              <NotificationButton unread={data.unreadNotices} />
            </Link>
            <Avatar name={data.me.name} detail={data.me.rollNumber} />
          </>
        }
      />

      <Panel
        title="Today's classes"
        action={
          <Link to="/student/attendance" className="panel__link">
            Scan attendance
          </Link>
        }
      >
        {data.today.length === 0 ? (
          <p className="empty-note">No classes in the timetable today.</p>
        ) : (
          <DayTimeline periods={data.today} now={data.now} />
        )}
      </Panel>

      <Panel
        title="Attendance register"
        description={
          held.length === 0
            ? 'No classes have been held yet.'
            : `Above the 75% minimum in ${held.length - below.length} of ${held.length} subjects.${
                notStarted.length ? ` No classes yet in ${notStarted.map((s) => s.code).join(', ')}.` : ''
              }`
        }
        action={
          held.length > 0 && (
            <div className="register-legend">
              <span>
                <span className="mark is-present" aria-hidden="true" />
                Present
              </span>
              <span>
                <span className="mark is-absent" aria-hidden="true" />
                Absent
              </span>
              <span>Last 12 classes, oldest on the left</span>
            </div>
          )
        }
      >
        {held.length > 0 && <AttendanceRegister subjects={held} />}
      </Panel>

      <div className="columns">
        <div className="column column--wide">
          <Panel
            title="Notices"
            action={
              <Link to="/student/notices" className="panel__link">
                All notices
              </Link>
            }
          >
            {data.notices.length === 0 && <p className="empty-note">No notices yet.</p>}
            {data.notices.map((notice) => (
              <div className="list-row" key={notice._id}>
                <span className={`unread-dot ${notice.isNew ? 'is-unread' : ''}`} aria-hidden="true" />
                <div className="list-row__body">
                  <div className="list-row__title">
                    {notice.title}
                    {notice.important && <span className="notice__tag notice__tag--important home-tag">Important</span>}
                  </div>
                  <div className="list-row__meta">
                    From {notice.postedBy ?? 'the college'},{' '}
                    {new Date(notice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </Panel>
        </div>

        <div className="column">
          <Panel title="Coming up">
            {data.comingUp.length === 0 && <p className="empty-note">Nothing scheduled this week.</p>}
            {data.comingUp.map((item) => {
              const d = shortDate(item.date)
              return (
                <Link
                  to={item.link}
                  className="list-row list-row--link"
                  key={`${item.kind}-${item.title}-${item.date}`}
                >
                  <div className={`date-chip ${item.kind === 'internship' ? 'is-deadline' : ''}`}>
                    <span className="date-chip__month">{d.month}</span>
                    <span className="date-chip__day">{d.day}</span>
                  </div>
                  <div className="list-row__body">
                    <div className="list-row__title">{item.title}</div>
                    <div className="list-row__meta">{item.detail}</div>
                  </div>
                </Link>
              )
            })}
          </Panel>
        </div>
      </div>
    </>
  )
}
