import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import AttendanceMeter from '../../components/dashboard/AttendanceMeter.jsx'
import EventRow from '../../components/ojt/EventRow.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { monthLabel } from '../../utils/ojt.js'

const OJT = {
  not_sent: { label: 'Not sent', chip: 'rejected' },
  submitted: { label: 'To review', chip: 'pending' },
  needs_changes: { label: 'Needs changes', chip: 'rejected' },
  reviewed: { label: 'Reviewed', chip: 'approved' },
}
const studentColumns = { gridTemplateColumns: '0.9fr minmax(160px, 1.5fr) minmax(170px, 1.3fr) 1fr 0.6fr 0.9fr' }
const batchLabel = (b) => `${b.department?.code ?? ''} ${b.name}`.trim()

export default function BatchDashboardPage() {
  const { token, profile } = useAuth()
  const batches = profile?.batches ?? []
  const [batchId, setBatchId] = useState('')
  const [data, setData] = useState(null)
  const [onlyLow, setOnlyLow] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/dashboard/batch${batchId ? `?batch=${batchId}` : ''}`, { token })
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token, batchId])

  if (error) {
    return (
      <p className="login__error" role="alert">
        {error}
      </p>
    )
  }
  if (!data) return <div className="auth-loading">Loading your batch...</div>
  if (!data.batch) {
    return <Panel title="No batch yet" description="Ask the admin to assign you a batch in Users." />
  }

  const { counts } = data
  const toReview = counts.activitiesToReview + counts.ojtToReview
  const shown = onlyLow ? data.students.filter((s) => s.lowSubjects.length > 0) : data.students

  const attention = [
    counts.belowMinimum > 0 && {
      text: `${counts.belowMinimum} ${counts.belowMinimum === 1 ? 'student is' : 'students are'} below 75% in at least one subject`,
      action: 'Show them',
      onClick: () => setOnlyLow(true),
      severity: 'high',
    },
    counts.activitiesToReview > 0 && {
      text: `${counts.activitiesToReview} impact score ${counts.activitiesToReview === 1 ? 'activity' : 'activities'} waiting for review`,
      to: '/batch/activities',
      action: 'Review',
      severity: 'mid',
    },
    counts.ojtToReview > 0 && {
      text: `${counts.ojtToReview} OJT ${counts.ojtToReview === 1 ? 'update' : 'updates'} waiting for review`,
      to: '/batch/ojt',
      action: 'Review',
      severity: 'mid',
    },
    counts.ojtNotSent > 0 && {
      text: `${counts.ojtNotSent} ${counts.ojtNotSent === 1 ? 'student has' : 'students have'} not sent the ${monthLabel(data.month)} OJT update`,
      to: '/batch/notices',
      action: 'Post a reminder',
      severity: 'low',
    },
  ].filter(Boolean)

  return (
    <>
      <PageHeader
        kicker={`Batch manager · semester ${data.batch.semester}`}
        title={batchLabel(data.batch)}
        subtitle={data.batch.department?.name}
        stats={[
          { label: 'Students', value: String(counts.students), note: 'active in this batch' },
          {
            label: 'Below 75%',
            value: String(counts.belowMinimum),
            note: 'in at least one subject',
            tone: counts.belowMinimum ? 'red' : undefined,
          },
          { label: 'To review', value: String(toReview), note: 'impact + OJT', tone: toReview ? 'amber' : undefined },
          {
            label: 'OJT not sent',
            value: String(counts.ojtNotSent),
            note: monthLabel(data.month),
            tone: counts.ojtNotSent ? 'red' : undefined,
          },
        ]}
        actions={
          batches.length > 1 && (
            <label className="field field--inline">
              <span className="sr-only">Batch</span>
              <select value={data.batch._id} onChange={(e) => setBatchId(e.target.value)}>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {batchLabel(b)}
                  </option>
                ))}
              </select>
            </label>
          )
        }
      />

      <div className="columns">
        <div className="column column--wide">
          <Panel title="Needs your attention">
            {attention.length === 0 && <p className="empty-note">All clear. Nothing needs you right now.</p>}
            {attention.map((item) => (
              <div className="list-row" key={item.text}>
                <span className={`severity severity--${item.severity}`} aria-hidden="true" />
                <div className="list-row__body">
                  <div className="list-row__title">{item.text}</div>
                </div>
                {item.to ? (
                  <Link className="btn btn--outline" to={item.to}>
                    {item.action}
                  </Link>
                ) : (
                  <button type="button" className="btn btn--outline" onClick={item.onClick}>
                    {item.action}
                  </button>
                )}
              </div>
            ))}
          </Panel>
        </div>
        <div className="column">
          <Panel title="Coming up">
            {data.upcoming.length === 0 && <p className="empty-note">No OJT dates scheduled.</p>}
            {data.upcoming.map((e) => (
              <EventRow key={e._id} event={e} />
            ))}
          </Panel>
        </div>
      </div>

      <Panel
        title="Students"
        description="Lowest attendance first."
        action={
          <span className="chips">
            <button
              type="button"
              className={`chip ${onlyLow ? '' : 'is-active'}`}
              onClick={() => setOnlyLow(false)}
              aria-pressed={!onlyLow}
            >
              All <span>{data.students.length}</span>
            </button>
            <button
              type="button"
              className={`chip ${onlyLow ? 'is-active' : ''}`}
              onClick={() => setOnlyLow(true)}
              aria-pressed={onlyLow}
            >
              Below 75% <span>{counts.belowMinimum}</span>
            </button>
          </span>
        }
      >
        {shown.length === 0 && <p className="empty-note">No students here.</p>}
        {shown.length > 0 && (
          <div className="table-scroll">
            <div className="data-table data-table--users">
              <div className="data-table__row data-table__row--head" style={studentColumns}>
                <span>Roll number</span>
                <span>Name</span>
                <span>Attendance</span>
                <span>Below 75% in</span>
                <span>Impact</span>
                <span>OJT</span>
              </div>
              {shown.map((s) => (
                <div className="data-table__row" style={studentColumns} key={s._id}>
                  <span className="tag">{s.rollNumber}</span>
                  <strong>{s.name}</strong>
                  {s.attendance === null ? (
                    <span className="user-cell__muted">No classes yet</span>
                  ) : (
                    <AttendanceMeter percent={s.attendance} />
                  )}
                  <span className={s.lowSubjects.length ? 'text-red' : 'user-cell__muted'}>
                    {s.lowSubjects.length ? s.lowSubjects.join(', ') : '—'}
                  </span>
                  <span>{s.impact}</span>
                  <span>
                    <span className={`status status--${OJT[s.ojt].chip}`}>{OJT[s.ojt].label}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <div className="columns">
        <div className="column column--wide">
          <Panel title="Subjects" description="Average attendance of the whole batch in each subject.">
            {data.subjects.length === 0 && <p className="empty-note">No courses in this batch yet.</p>}
            {data.subjects.map((c) => (
              <div className="subject-row" key={c.code}>
                <div className="subject-row__name">
                  <span className="tag">{c.code}</span>
                  <span>
                    <strong>{c.name}</strong>
                    <span className="subject-row__teacher">{c.teacher ?? 'Teacher not assigned'}</span>
                  </span>
                </div>
                <div className="subject-row__meter">
                  {c.average === null ? (
                    <span className="subject-row__none">No classes yet</span>
                  ) : (
                    <AttendanceMeter percent={c.average} />
                  )}
                </div>
                <div className="subject-row__advice">{c.held} classes held</div>
              </div>
            ))}
          </Panel>
        </div>
        <div className="column">
          <Panel title="Top impact scores">
            {data.top.length === 0 && <p className="empty-note">No approved points yet.</p>}
            <ol className="leaderboard">
              {data.top.map((r) => (
                <li className="leaderboard__row" key={r.rollNumber}>
                  <span className="leaderboard__rank">#{r.rank}</span>
                  <span className="leaderboard__name">
                    {r.name}
                    <span className="leaderboard__roll">{r.rollNumber}</span>
                  </span>
                  <span className="leaderboard__points">{r.impact}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  )
}
