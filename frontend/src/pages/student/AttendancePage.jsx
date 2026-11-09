import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import AttendanceMeter from '../../components/dashboard/AttendanceMeter.jsx'
import QrScanner from '../../components/attendance/QrScanner.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

const when = (value) =>
  new Date(value).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export default function AttendancePage() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)

  const load = useCallback(
    () =>
      api('/attendance/mine', { token })
        .then(setData)
        .catch((err) => setError(err.message)),
    [token]
  )

  useEffect(() => {
    load()
  }, [load])

  const send = useCallback(
    async (qr) => {
      setScanning(false)
      setResult(null)
      try {
        const res = await api('/attendance/scan', { method: 'POST', token, body: { qr } })
        setResult({ ok: true, message: `${res.message} for ${res.course.code} · ${res.course.name}` })
        load()
      } catch (err) {
        setResult({ ok: false, message: err.message })
      }
    },
    [token, load]
  )

  const overall = data?.overall
  const low = data?.courses.filter((c) => c.held > 0 && !c.ok) ?? []

  return (
    <>
      <PageHeader
        kicker="Attendance"
        title="Your attendance"
        subtitle="Scan the QR your teacher shows in class. You need 75% in every subject."
        stats={[
          {
            label: 'Overall',
            value: overall ? (overall.percent === null ? '—' : `${overall.percent}%`) : '...',
            note: overall ? `${overall.attended} of ${overall.held} classes` : '',
            tone: overall && overall.percent !== null && !overall.ok ? 'red' : 'amber',
          },
          {
            label: 'Below 75%',
            value: data ? low.length : '...',
            note: low.length ? low.map((c) => c.course.code).join(', ') : 'all subjects are fine',
            tone: low.length ? 'red' : undefined,
          },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <Panel title="Mark attendance" description="Only works while your teacher's session is open.">
        {result && (
          <p className={result.ok ? 'scan-result is-ok' : 'login__error'} role="status">
            {result.message}
          </p>
        )}
        {scanning ? (
          <QrScanner onFound={send} onCancel={() => setScanning(false)} />
        ) : (
          <button type="button" className="btn btn--primary scan-button" onClick={() => setScanning(true)}>
            Scan QR
          </button>
        )}
      </Panel>

      <div className="columns">
        <div className="column column--wide">
          <Panel title="By subject">
            {data && data.courses.length === 0 && <p className="empty-note">No subjects in your batch yet.</p>}
            {data?.courses.map((c) => (
              <div className="subject-row" key={c.course._id}>
                <div className="subject-row__name">
                  <span className="tag">{c.course.code}</span>
                  <span>
                    <strong>{c.course.name}</strong>
                    <span className="subject-row__teacher">{c.course.teacher ?? 'Teacher not assigned'}</span>
                  </span>
                </div>
                <div className="subject-row__meter">
                  {c.percent === null ? (
                    <span className="subject-row__none">No classes yet</span>
                  ) : (
                    <AttendanceMeter percent={c.percent} />
                  )}
                </div>
                <div className={`subject-row__advice ${c.ok ? '' : 'is-low'}`}>
                  {c.attended} of {c.held} · {c.message}
                </div>
              </div>
            ))}
          </Panel>
        </div>

        <div className="column">
          <Panel title="Recent classes">
            {data && data.recent.length === 0 && <p className="empty-note">No classes held yet.</p>}
            <ul className="recent-list">
              {data?.recent.map((r) => (
                <li key={r._id}>
                  <span className="tag">{r.course}</span>
                  <span className="recent-list__when">{when(r.startedAt)}</span>
                  <span className={`status ${r.present ? 'status--approved' : 'status--rejected'}`}>
                    {r.present ? 'Present' : 'Absent'}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
