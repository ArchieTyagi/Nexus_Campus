import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { isLow } from '../../utils/attendance.js'
import { downloadCsv } from '../../utils/csv.js'

const columns = { gridTemplateColumns: 'minmax(200px, 1.6fr) minmax(170px, 1.2fr) 90px 64px minmax(170px, 1.2fr)' }

const dayAndTime = (value) =>
  new Date(value).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })

// What the numbers mean for one student, written for the teacher
function status(student, held) {
  if (held === 0) return 'No classes yet'
  if (!student.ok) return `Needs the next ${student.toRecover} ${student.toRecover === 1 ? 'class' : 'classes'}`
  if (student.canMiss > 0) return `Can miss ${student.canMiss} more`
  return 'Must attend every class'
}

function Marks({ recent }) {
  if (!recent) return <span className="muted">—</span>
  const marks = recent.split('')
  const present = marks.filter((m) => m === 'P').length
  return (
    <div className="marks" role="img" aria-label={`Present in ${present} of the last ${marks.length} classes`}>
      {marks.map((mark, index) => (
        <span key={index} className={`mark ${mark === 'P' ? 'is-present' : 'is-absent'}`} />
      ))}
    </div>
  )
}

export default function MyCoursesPage() {
  const { token } = useAuth()
  const [params, setParams] = useSearchParams()
  const [courses, setCourses] = useState(null)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [sortBy, setSortBy] = useState('roll')

  const courseId = params.get('course') || courses?.[0]?._id || ''

  useEffect(() => {
    api('/attendance/courses', { token })
      .then(setCourses)
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(() => {
    if (!courseId) return
    let stale = false
    api(`/attendance/courses/${courseId}/report`, { token })
      .then((data) => !stale && setReport(data))
      .catch((err) => !stale && setError(err.message))
    return () => {
      stale = true
    }
  }, [token, courseId])

  const pickCourse = (event) => {
    setReport(null)
    setError('')
    setParams({ course: event.target.value }, { replace: true })
  }

  if (error && !report) {
    return (
      <p className="login__error" role="alert">
        {error}
      </p>
    )
  }
  if (!courses) return <div className="auth-loading">Loading your courses...</div>

  if (courses.length === 0) {
    return (
      <>
        <PageHeader kicker="My courses" title="No courses yet" subtitle="Ask the admin to assign you in Courses." />
      </>
    )
  }

  const shown = report
    ? report.students
        .filter((s) => !onlyLow || !s.ok)
        .filter((s) => {
          const text = search.trim().toLowerCase()
          return !text || s.name.toLowerCase().includes(text) || s.rollNumber.toLowerCase().includes(text)
        })
        .sort((a, b) =>
          sortBy === 'low' ? (a.percent ?? 101) - (b.percent ?? 101) || a.rollNumber.localeCompare(b.rollNumber) : 0,
        )
    : []

  function download() {
    const name = `${report.course.code}-${report.course.batch}`.replace(/\s+/g, '-')
    downloadCsv(`attendance-${name}.csv`, [
      ['Roll number', 'Name', 'Email', 'Attended', 'Classes held', 'Percent', 'Status'],
      ...report.students.map((s) => [
        s.rollNumber,
        s.name,
        s.email,
        s.attended,
        report.held,
        s.percent === null ? '' : `${s.percent}%`,
        status(s, report.held),
      ]),
    ])
  }

  return (
    <>
      <PageHeader
        kicker="My courses"
        title={report ? `${report.course.code} · ${report.course.name}` : 'Loading...'}
        subtitle={report ? `${report.course.batch}, ${report.students.length} students` : ''}
        stats={
          report
            ? [
                { label: 'Classes held', value: String(report.held), note: 'each attendance session is one class' },
                {
                  label: 'Average attendance',
                  value: report.average === null ? '—' : `${report.average}%`,
                  note: 'across the whole class',
                  tone: report.average !== null && isLow(report.average) ? 'red' : undefined,
                },
                {
                  label: 'Below 75%',
                  value: String(report.below),
                  note: report.below ? 'students to follow up' : 'everyone is fine',
                  tone: report.below ? 'red' : undefined,
                },
              ]
            : []
        }
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <div className="filter-row">
        <label className="field field--inline">
          <span className="sr-only">Course</span>
          <select value={courseId} onChange={pickCourse}>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} · {c.name} · {c.batch?.name}
              </option>
            ))}
          </select>
        </label>
        <Link to={`/teacher/attendance?course=${courseId}`} className="btn btn--outline">
          <Icon name="checklist" size={18} />
          Take attendance
        </Link>
      </div>

      {!report && <div className="auth-loading">Loading the class...</div>}

      {report && (
        <>
          <Panel
            title="Students"
            description={`Last ${Math.min(report.held, 12)} classes shown as marks, oldest on the left.`}
            action={
              report.students.length > 0 && (
                <button type="button" className="btn btn--outline" onClick={download}>
                  Download CSV
                </button>
              )
            }
          >
            <div className="filter-row">
              <label className="search search--light">
                <Icon name="search" size={18} />
                <span className="sr-only">Search</span>
                <input
                  type="search"
                  placeholder="Name or roll number"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className="field field--inline">
                <span className="sr-only">Sort</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="roll">By roll number</option>
                  <option value="low">Lowest attendance first</option>
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
                Only below 75%
              </label>
            </div>

            {report.students.length === 0 && <p className="empty-note">No students in this batch yet.</p>}
            {report.students.length > 0 && shown.length === 0 && (
              <p className="empty-note">No student matches these filters.</p>
            )}
            {shown.length > 0 && (
              <div className="table-scroll">
                <div className="data-table data-table--wide">
                  <div className="data-table__row data-table__row--head" style={columns}>
                    <span>Student</span>
                    <span>Recent classes</span>
                    <span>Attended</span>
                    <span>Share</span>
                    <span>What it means</span>
                  </div>
                  {shown.map((s) => (
                    <div className="data-table__row" style={columns} key={s._id}>
                      <div>
                        <div className="strong">{s.name}</div>
                        <div className="register__meta">{s.rollNumber}</div>
                      </div>
                      <Marks recent={s.recent} />
                      <span>
                        {s.attended} of {report.held}
                      </span>
                      <span className={s.ok ? 'strong' : 'text-red'}>{s.percent === null ? '—' : `${s.percent}%`}</span>
                      <span className={s.ok ? 'muted register__note' : 'text-red register__note'}>
                        {status(s, report.held)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Recent classes" description="Newest first. Each one is an attendance session you ran.">
            {report.classes.length === 0 && <p className="empty-note">No classes held yet.</p>}
            {report.classes.map((c) => (
              <div className="list-row" key={c._id}>
                <div className="list-row__body">
                  <div className="list-row__title">{dayAndTime(c.startedAt)}</div>
                  <div className="list-row__meta">
                    {c.present} of {report.students.length} present
                  </div>
                </div>
                {c.isOpen && (
                  <Link to={`/teacher/attendance?session=${c._id}`} className="btn btn--outline">
                    Running, open it
                  </Link>
                )}
              </div>
            ))}
          </Panel>
        </>
      )}
    </>
  )
}
