import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import Panel from '../components/ui/Panel.jsx'
import Icon from '../components/ui/Icon.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationButton from '../components/ui/NotificationButton.jsx'
import AttendanceMeter from '../components/dashboard/AttendanceMeter.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'
import { greeting, todayLabel } from '../utils/date.js'

const deptColumns = { gridTemplateColumns: 'minmax(220px, 2.2fr) 0.7fr 0.8fr 0.8fr 1.8fr' }

const quickActions = [
  { label: 'Add a person', icon: 'addUser', to: '/admin/users' },
  { label: 'Import a class from CSV', icon: 'upload', to: '/admin/users' },
  { label: 'Create a batch', icon: 'department', to: '/admin/departments' },
  { label: 'Build timetable', icon: 'calendar', to: '/admin/timetable' },
]

const ATTENDANCE_LABELS = {
  open: 'attendance open now',
  taken: 'attendance taken',
  not_taken: 'attendance not taken yet',
}

const shortDay = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default function AdminDashboard() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/dashboard/admin', { token })
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
  if (!data) return <div className="auth-loading">Loading the campus...</div>

  const { stats } = data
  const missed = stats.endedToday - stats.markedToday
  const campusStats = [
    { label: 'Students', value: stats.students.toLocaleString('en-IN'), note: `in ${stats.batches} batches` },
    { label: 'Teachers', value: stats.teachers.toLocaleString('en-IN'), note: `in ${stats.departments} departments` },
    { label: 'Classes today', value: String(stats.classesToday), note: `${stats.runningNow} running right now` },
    {
      label: 'Attendance marked',
      value: `${stats.markedToday} of ${stats.endedToday}`,
      note: missed ? `${missed} finished without it` : 'classes finished so far',
      tone: missed ? 'red' : undefined,
    },
  ]

  return (
    <>
      <PageHeader
        kicker={todayLabel()}
        title={`${greeting()}, ${data.me.name.split(' ')[0]}`}
        subtitle="Here is how the campus is running today, and what needs you."
        stats={campusStats}
        actions={
          <>
            <Link to="/admin/notices" aria-label={`Notices, ${data.unreadNotices} new`}>
              <NotificationButton unread={data.unreadNotices} />
            </Link>
            <Avatar name={data.me.name} detail="Admin" />
          </>
        }
      />

      <div className="columns">
        <div className="column column--wide">
          <Panel
            title="Needs your attention"
            description="Things that stop classes, attendance or reviews from running smoothly."
          >
            {data.attention.length === 0 && <p className="empty-note">Nothing needs you right now.</p>}
            {data.attention.map((item) => (
              <div className="list-row" key={item.key}>
                <span className={`severity severity--${item.severity}`} aria-hidden="true" />
                <div className="list-row__body">
                  <div className="list-row__title">{item.title}</div>
                  <div className="list-row__meta">{item.detail}</div>
                </div>
                {item.link && (
                  <Link to={item.link} className="btn btn--outline">
                    {item.action}
                  </Link>
                )}
              </div>
            ))}
          </Panel>

          <Panel
            title="Departments"
            action={
              <span className="legend">
                <span className="legend__tick" aria-hidden="true" />
                Attendance so far, 75% minimum
              </span>
            }
          >
            {data.departments.length === 0 && (
              <p className="empty-note">
                No departments yet. <Link to="/admin/departments">Add the first one</Link>.
              </p>
            )}
            {data.departments.length > 0 && (
              <div className="table-scroll">
                <div className="data-table">
                  <div className="data-table__row data-table__row--head" style={deptColumns}>
                    <span>Department</span>
                    <span>Batches</span>
                    <span>Students</span>
                    <span>Teachers</span>
                    <span>Attendance</span>
                  </div>
                  {data.departments.map((dept) => (
                    <div className="data-table__row" style={deptColumns} key={dept._id}>
                      <span className="strong">{dept.name}</span>
                      <span>{dept.batches}</span>
                      <span>{dept.students}</span>
                      <span>{dept.teachers}</span>
                      {dept.attendance === null ? (
                        <span className="muted">No classes yet</span>
                      ) : (
                        <AttendanceMeter percent={dept.attendance} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className="column">
          <Panel title="Quick actions">
            <div className="action-grid">
              {quickActions.map((action) => (
                <Link to={action.to} className="action-tile" key={action.label}>
                  <span className="action-tile__icon">
                    <Icon name={action.icon} size={19} strokeWidth={1.9} />
                  </span>
                  {action.label}
                </Link>
              ))}
            </div>
          </Panel>

          <Panel
            title="Running now"
            action={
              <span className="pill pill--amber">
                <span className="pill__dot" aria-hidden="true" />
                {data.now}
              </span>
            }
          >
            {data.running.length === 0 && <p className="empty-note">No classes are running right now.</p>}
            {data.running.map((cls) => (
              <div className="list-row" key={cls._id}>
                <span className="tag">{cls.room || '—'}</span>
                <div className="list-row__body">
                  <div className="list-row__title">{cls.name}</div>
                  <div className={`list-row__meta ${cls.attendance === 'not_taken' ? 'text-red' : ''}`}>
                    {cls.code} for {cls.batch}, {cls.teacher}, {ATTENDANCE_LABELS[cls.attendance]}
                  </div>
                </div>
              </div>
            ))}
            <Link to="/admin/timetable" className="panel__link">
              Full timetable
            </Link>
          </Panel>

          <Panel
            title="Recent notices"
            action={
              <Link to="/admin/notices" className="panel__link">
                All notices
              </Link>
            }
          >
            {data.notices.length === 0 && <p className="empty-note">No notices yet.</p>}
            {data.notices.map((notice) => (
              <div className="list-row" key={notice._id}>
                <div className="list-row__body">
                  <div className="list-row__title">{notice.title}</div>
                  <div className="list-row__meta">
                    {notice.audience}, posted {shortDay(notice.createdAt)}
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
