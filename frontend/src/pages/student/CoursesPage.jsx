import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { isLow } from '../../utils/attendance.js'

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// "Mon, Wed 9:00 to 10:00. Fri 14:00 to 16:00": days grouped by the same time
function weekLine(slots) {
  if (slots.length === 0) return 'Not in the timetable yet'
  const byTime = new Map()
  for (const s of [...slots].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))) {
    const key = `${s.startTime} to ${s.endTime}`
    byTime.set(key, [...(byTime.get(key) ?? []), s.day])
  }
  return [...byTime].map(([time, days]) => `${days.join(', ')} ${time}`).join('. ')
}

// Every subject of the student's batch: who teaches it, when it meets, and their attendance in it
export default function CoursesPage() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api('/courses', { token }),
      api('/attendance/mine', { token }),
      api('/timetable', { token }),
      api('/materials', { token }),
    ])
      .then(([courses, attendance, slots, materials]) => setData({ courses, attendance, slots, materials }))
      .catch((err) => setError(err.message))
  }, [token])

  if (error) {
    return (
      <p className="login__error" role="alert">
        {error}
      </p>
    )
  }
  if (!data) return <div className="auth-loading">Loading your courses...</div>

  const current = data.courses[0]?.batch?.currentSemester
  const attendanceFor = (id) => data.attendance.courses.find((c) => c.course._id === id)
  const slotsFor = (id) => data.slots.filter((s) => s.course?._id === id)
  const materialsFor = (code) => data.materials.filter((m) => m.subject === code).length

  // This semester first, then earlier ones
  const semesters = [...new Set(data.courses.map((c) => c.semester))].sort((a, b) =>
    a === current ? -1 : b === current ? 1 : b - a,
  )
  const thisSem = data.courses.filter((c) => c.semester === current)
  const credits = thisSem.reduce((n, c) => n + (c.credits ?? 0), 0)
  const low = thisSem.filter((c) => {
    const a = attendanceFor(c._id)
    return a && a.percent !== null && isLow(a.percent)
  })

  return (
    <>
      <PageHeader
        kicker="Courses"
        title="Your subjects"
        subtitle={current ? `Semester ${current}, ${data.courses[0].batch.name}.` : 'Subjects of your batch.'}
        stats={[
          { label: 'This semester', value: String(thisSem.length), note: `${credits} credits` },
          {
            label: 'Below 75%',
            value: String(low.length),
            note: low.length ? low.map((c) => c.code).join(', ') : 'all fine',
            tone: low.length ? 'red' : undefined,
          },
        ]}
      />

      {data.courses.length === 0 && (
        <Panel>
          <p className="empty-note">No subjects have been added for your batch yet.</p>
        </Panel>
      )}

      {semesters.map((sem) => (
        <Panel key={sem} title={sem === current ? `Semester ${sem}, now` : `Semester ${sem}`}>
          <div className="course-list">
            {data.courses
              .filter((c) => c.semester === sem)
              .map((c) => {
                const a = attendanceFor(c._id)
                const files = materialsFor(c.code)
                const behind = a && a.percent !== null && isLow(a.percent)
                return (
                  <article className="course-item" key={c._id}>
                    <div className="course-item__main">
                      <h3 className="course-item__name">{c.name}</h3>
                      <p className="course-item__meta">
                        {c.code}, {c.credits} {c.credits === 1 ? 'credit' : 'credits'}.{' '}
                        {c.teacher?.user?.name ? `Taught by ${c.teacher.user.name}` : 'Teacher not assigned yet'}
                      </p>
                      <p className="course-item__meta">{weekLine(slotsFor(c._id))}</p>
                    </div>
                    <div className="course-item__side">
                      <span className={`course-item__percent ${behind ? 'text-red' : ''}`}>
                        {a?.percent === null || !a ? '—' : `${a.percent}%`}
                      </span>
                      <span className={`course-item__note ${behind ? 'text-red' : ''}`}>
                        {a && a.held > 0 ? `${a.attended} of ${a.held} classes. ${a.message}` : 'No classes yet'}
                      </span>
                      {files > 0 && (
                        <Link to={`/student/materials?subject=${encodeURIComponent(c.code)}`} className="panel__link">
                          {files} study {files === 1 ? 'file' : 'files'}
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
          </div>
        </Panel>
      ))}
    </>
  )
}
