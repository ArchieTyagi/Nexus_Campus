import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import Panel from '../components/ui/Panel.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationButton from '../components/ui/NotificationButton.jsx'
import BatchChart from '../components/dashboard/BatchChart.jsx'
import Agenda from '../components/dashboard/Agenda.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'
import { isLow } from '../utils/attendance.js'
import { greeting, todayLabel } from '../utils/date.js'

const AT_RISK_SHOWN = 8
const riskColumns = { gridTemplateColumns: 'minmax(170px, 1.5fr) minmax(110px, 1fr) 80px minmax(140px, 1.2fr)' }
const STATUS = {
  open: { note: 'Attendance open' },
  taken: { note: 'Marked' },
  missed: { note: 'Not marked', tone: 'red' },
}

export default function HodDashboard() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/dashboard/hod', { token })
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
  if (!data) return <div className="auth-loading">Loading your department...</div>

  const { stats } = data
  const lowBatches = data.batches.filter((b) => b.average !== null && isLow(b.average)).length
  const periods = data.today.map((p) => ({ ...p, place: `${p.place}, ${p.teacher}`, ...(STATUS[p.attendance] ?? {}) }))

  return (
    <>
      <PageHeader
        kicker={`${todayLabel()}, ${data.me.department.name}`}
        title={`${greeting()}, ${data.me.name.split(' ')[0]}`}
        subtitle="Here is how your department is doing, and who needs a follow up."
        stats={[
          { label: 'Students', value: String(stats.students), note: `in ${stats.batches} batches` },
          { label: 'Faculty', value: String(stats.teachers), note: `${stats.classesToday} classes today` },
          {
            label: 'Attendance',
            value: stats.average === null ? '—' : `${stats.average}%`,
            note: 'across the department',
            tone: stats.average !== null && isLow(stats.average) ? 'red' : undefined,
          },
          {
            label: 'Below 75%',
            value: String(stats.below),
            note: stats.below ? 'students to follow up' : 'everyone is fine',
            tone: stats.below ? 'red' : undefined,
          },
        ]}
        actions={
          <>
            <Link to="/hod/notices" className="btn btn--outline">
              Post a notice
            </Link>
            <Link to="/hod/notices" aria-label={`Notices, ${data.unreadNotices} new`}>
              <NotificationButton unread={data.unreadNotices} />
            </Link>
            <Avatar name={data.me.name} detail="HOD" />
          </>
        }
      />

      {data.attention.length > 0 && (
        <Panel title="Needs your attention">
          {data.attention.map((item) => (
            <div className="list-row" key={item.key}>
              <span className={`severity severity--${item.severity}`} aria-hidden="true" />
              <div className="list-row__body">
                <div className="list-row__title">{item.title}</div>
                <div className="list-row__meta">{item.detail}</div>
              </div>
            </div>
          ))}
        </Panel>
      )}

      <Panel
        title="Attendance by batch"
        description={
          data.batches.length
            ? `${lowBatches} of ${data.batches.length} batches are under the 75% line.`
            : 'Your department has no batches yet.'
        }
        action={
          <span className="legend">
            <span className="legend__dash" aria-hidden="true" />
            75% minimum
          </span>
        }
      >
        <BatchChart
          batches={data.batches.map((b) => ({
            name: b.name,
            detail: `Semester ${b.semester}, ${b.students} students${b.below ? `, ${b.below} below 75%` : ''}`,
            attendance: b.average,
          }))}
        />
      </Panel>

      <div className="columns">
        <div className="column column--wide">
          <Panel
            title="Students below 75%"
            description={data.atRisk.length ? 'Lowest overall attendance first.' : 'Nobody is below 75% right now.'}
            action={
              <Link to="/hod/department" className="panel__link">
                Full report
              </Link>
            }
          >
            {data.atRisk.length > 0 && (
              <div className="table-scroll">
                <div className="data-table">
                  <div className="data-table__row data-table__row--head" style={riskColumns}>
                    <span>Student</span>
                    <span>Batch</span>
                    <span>Overall</span>
                    <span>Lowest subject</span>
                  </div>
                  {data.atRisk.slice(0, AT_RISK_SHOWN).map((s) => (
                    <div className="data-table__row" style={riskColumns} key={s._id}>
                      <div>
                        <div className="strong">{s.name}</div>
                        <div className="register__meta">{s.rollNumber}</div>
                      </div>
                      <span className="register__meta">{s.batch}</span>
                      <span className="text-red strong">{s.overall === null ? '—' : `${s.overall}%`}</span>
                      <span>
                        {s.lowest.code} <span className="text-red">{s.lowest.percent}%</span>
                        {s.subjectsBelow > 1 && (
                          <span className="register__meta">, and {s.subjectsBelow - 1} more</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.atRisk.length > AT_RISK_SHOWN && (
              <p className="empty-note">And {data.atRisk.length - AT_RISK_SHOWN} more in the full report.</p>
            )}
          </Panel>

          <Panel title="Today in the department">
            {data.today.length === 0 ? (
              <p className="empty-note">No classes in the timetable today.</p>
            ) : (
              <Agenda periods={periods} now={data.now} />
            )}
          </Panel>
        </div>

        <div className="column">
          <Panel
            title="Faculty this week"
            description="Teaching hours from the timetable."
            action={
              <Link to="/hod/faculty" className="panel__link">
                All faculty
              </Link>
            }
          >
            {data.faculty.length === 0 && <p className="empty-note">No teachers in this department yet.</p>}
            {data.faculty.map((t) => (
              <div className="list-row" key={t._id}>
                <div className="list-row__body">
                  <div className="list-row__title">
                    {t.name}
                    {t.isHod && <span className="register__meta"> (HOD)</span>}
                  </div>
                  <div className="list-row__meta">
                    {t.courses.length ? t.courses.map((c) => `${c.code} ${c.batch}`).join(', ') : 'No courses yet'}
                  </div>
                </div>
                <div className="align-right strong">{t.hours} h</div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  )
}
