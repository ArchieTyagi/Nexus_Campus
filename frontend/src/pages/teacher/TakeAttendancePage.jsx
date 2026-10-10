import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import QrCode from '../../components/attendance/QrCode.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

function minutesLeft(endsAt, now) {
  const ms = new Date(endsAt) - now
  if (ms <= 0) return '0:00'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function TakeAttendancePage() {
  const { token } = useAuth()
  // ?course=<id> picks the course, ?session=<id> opens a running session (both come from the dashboard)
  const [params, setParams] = useSearchParams()
  const [courses, setCourses] = useState(null)
  const [courseId, setCourseId] = useState('')
  const [sessionId, setSessionId] = useState(() => params.get('session'))
  const wantedCourse = params.get('course')
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    api('/attendance/courses', { token })
      .then((list) => {
        setCourses(list)
        const wanted = list.find((c) => c._id === wantedCourse)
        if (wanted || list[0]) setCourseId((wanted ?? list[0])._id)
      })
      .catch((err) => setError(err.message))
  }, [token, wantedCourse])

  async function start() {
    setError('')
    setStarting(true)
    try {
      const data = await api('/attendance/sessions', { method: 'POST', token, body: { course: courseId } })
      setSessionId(data.session._id)
    } catch (err) {
      setError(err.message)
    } finally {
      setStarting(false)
    }
  }

  if (sessionId) {
    return (
      <LiveSession
        key={sessionId}
        sessionId={sessionId}
        token={token}
        onDone={() => {
          setSessionId(null)
          setParams({}, { replace: true })
        }}
      />
    )
  }

  return (
    <>
      <PageHeader
        kicker="Attendance"
        title="Take attendance"
        subtitle="Start a session and show the QR on the projector. Students scan it from the Nexus app. It closes on its own after 10 minutes."
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <Panel title="Which class?">
        {courses && courses.length === 0 && (
          <p className="empty-note">No courses are assigned to you yet. Ask the admin to assign you in Courses.</p>
        )}
        {courses && courses.length > 0 && (
          <div className="start-row">
            <label className="field">
              Course
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.code} · {c.name} · {c.batch?.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn--primary" onClick={start} disabled={starting || !courseId}>
              {starting ? 'Starting...' : 'Start attendance'}
            </button>
          </div>
        )}
      </Panel>
    </>
  )
}

function LiveSession({ sessionId, token, onDone }) {
  const [live, setLive] = useState(null)
  const [detail, setDetail] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)

  // QR code and count: check every 2 seconds while the session is open
  useEffect(() => {
    let stopped = false
    let timer
    const tick = () =>
      api(`/attendance/sessions/${sessionId}/qr`, { token })
        .then((data) => {
          if (stopped) return
          setLive({ ...data, fetchedAt: Date.now() })
          if (data.isOpen) timer = setTimeout(tick, 2000)
        })
        .catch((err) => !stopped && setError(err.message))
    tick()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [sessionId, token])

  // Student list: refresh every 5 seconds while open, once more when it closes
  const isOpen = live?.isOpen
  useEffect(() => {
    let stopped = false
    let timer
    const load = () =>
      api(`/attendance/sessions/${sessionId}`, { token })
        .then((data) => {
          if (stopped) return
          setDetail(data)
          if (isOpen) timer = setTimeout(load, 5000)
        })
        .catch(() => {})
    load()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [sessionId, token, isOpen])

  // Clock for the countdowns
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  async function close() {
    setClosing(true)
    try {
      await api(`/attendance/sessions/${sessionId}/close`, { method: 'POST', token })
      setLive((l) => ({ ...l, isOpen: false, qr: null }))
    } catch (err) {
      setError(err.message)
    } finally {
      setClosing(false)
    }
  }

  async function toggle(student) {
    try {
      const data = await api(`/attendance/sessions/${sessionId}/mark`, {
        method: 'POST',
        token,
        body: { student: student._id, present: !student.present },
      })
      setDetail((d) => ({
        ...d,
        students: d.students.map((s) =>
          s._id === student._id ? { ...s, present: data.marked, markedBy: data.marked ? 'teacher' : null } : s,
        ),
      }))
      setLive((l) => ({ ...l, present: data.present }))
    } catch (err) {
      setError(err.message)
    }
  }

  // The QR refreshes every 2s, so count its own 30s window down between refreshes
  const secondsLeft = live?.qr ? Math.max(1, live.qr.secondsLeft - Math.floor((now - live.fetchedAt) / 1000)) : 0
  const course = detail?.course
  const absent = detail?.students.filter((s) => !s.present) ?? []

  return (
    <>
      <PageHeader
        kicker={isOpen ? 'Attendance is open' : 'Attendance closed'}
        title={course ? `${course.code} · ${course.name}` : 'Attendance'}
        subtitle={
          isOpen
            ? 'Students: open Nexus Campus, go to Attendance and tap Scan.'
            : 'You can still mark students by hand below.'
        }
        stats={[
          {
            label: 'Present',
            value: live ? `${live.present} of ${live.total}` : '...',
            note: live ? `${live.total ? Math.round((live.present / live.total) * 100) : 0}% of the batch` : '',
            tone: 'amber',
          },
          {
            label: 'Time left',
            value: isOpen ? minutesLeft(live.endsAt, now) : 'Closed',
            note: isOpen ? 'then it closes on its own' : '',
          },
        ]}
        actions={
          isOpen ? (
            <button type="button" className="btn btn--outline" onClick={close} disabled={closing}>
              {closing ? 'Closing...' : 'Close attendance'}
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={onDone}>
              Start another class
            </button>
          )
        }
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <div className="columns">
        {isOpen && live?.qr && (
          <div className="column column--wide">
            <Panel className="qr-panel">
              <QrCode value={live.qr.value} size={360} />
              <p className="qr-panel__hint">
                Code changes in <strong>{secondsLeft}s</strong>, so a photo sent to a friend stops working.
              </p>
            </Panel>
          </div>
        )}

        <div className="column">
          <Panel
            title={isOpen ? `Not marked yet (${absent.length})` : 'Final list'}
            description="Tap a name to mark present or absent by hand, for example if a phone is dead."
          >
            <ul className="roll-list">
              {(isOpen ? absent : (detail?.students ?? [])).map((s) => (
                <li key={s._id}>
                  <button type="button" className={`roll ${s.present ? 'is-present' : ''}`} onClick={() => toggle(s)}>
                    <span className="roll__name">
                      {s.name}
                      <span>{s.rollNumber}</span>
                    </span>
                    <span className="roll__state">
                      {s.present ? (s.markedBy === 'teacher' ? 'Present (by you)' : 'Present') : 'Absent'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {isOpen && detail && absent.length === 0 && <p className="empty-note">Everyone is marked.</p>}
          </Panel>
        </div>
      </div>
    </>
  )
}
