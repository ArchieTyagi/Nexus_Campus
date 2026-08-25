import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

const columns = { gridTemplateColumns: 'minmax(190px, 1.3fr) minmax(130px, 0.8fr) minmax(220px, 1.6fr) 70px' }

// Puts each student in once, with their attendance in every course this teacher has with them
function combine(reports) {
  const byStudent = new Map()
  for (const r of reports) {
    for (const s of r.students) {
      if (!byStudent.has(s._id)) {
        byStudent.set(s._id, {
          _id: s._id,
          name: s.name,
          email: s.email,
          rollNumber: s.rollNumber,
          batch: r.course.batch,
          courses: [],
        })
      }
      byStudent.get(s._id).courses.push({ ...s, course: r.course, held: r.held })
    }
  }
  return [...byStudent.values()].map((s) => {
    const counted = s.courses.filter((c) => c.percent !== null)
    return {
      ...s,
      lowest: counted.length ? Math.min(...counted.map((c) => c.percent)) : null,
      behind: s.courses.some((c) => !c.ok),
    }
  })
}

// Every student in the courses a teacher teaches, in one list
export default function StudentsPage() {
  const { token } = useAuth()
  const [courses, setCourses] = useState(null)
  const [students, setStudents] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [courseId, setCourseId] = useState('all')
  const [onlyBehind, setOnlyBehind] = useState(false)
  const [sortBy, setSortBy] = useState('roll')

  useEffect(() => {
    api('/attendance/courses', { token })
      .then(async (list) => {
        setCourses(list)
        const reports = await Promise.all(list.map((c) => api(`/attendance/courses/${c._id}/report`, { token })))
        setStudents(combine(reports))
      })
      .catch((err) => setError(err.message))
  }, [token])

  if (error) {
    return (
      <p className="login__error" role="alert">
        {error}
      </p>
    )
  }
  if (!courses || !students) return <div className="auth-loading">Loading your students...</div>

  const text = search.trim().toLowerCase()
  const shown = students
    .filter((s) => courseId === 'all' || s.courses.some((c) => c.course._id === courseId))
    .filter((s) => !onlyBehind || s.behind)
    .filter((s) => !text || s.name.toLowerCase().includes(text) || s.rollNumber.toLowerCase().includes(text))
    .sort((a, b) =>
      sortBy === 'low'
        ? (a.lowest ?? 101) - (b.lowest ?? 101) || a.rollNumber.localeCompare(b.rollNumber)
        : a.rollNumber.localeCompare(b.rollNumber),
    )
  const behindCount = students.filter((s) => s.behind).length

  return (
    <>
      <PageHeader
        kicker="Students"
        title="Your students"
        subtitle="Everyone in the courses you teach, with their attendance in each one."
        stats={[
          {
            label: 'Students',
            value: String(students.length),
            note: `in ${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`,
          },
          {
            label: 'Below 75%',
            value: String(behindCount),
            note: behindCount ? 'in at least one of your courses' : 'everyone is fine',
            tone: behindCount ? 'red' : undefined,
          },
        ]}
      />

      <Panel>
        {courses.length === 0 && (
          <p className="empty-note">No courses are assigned to you yet. Ask the admin to assign you in Courses.</p>
        )}

        {courses.length > 0 && (
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
              <span className="sr-only">Course</span>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="all">All my courses</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.code} {c.name}, {c.batch?.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--inline">
              <span className="sr-only">Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="roll">By roll number</option>
                <option value="low">Lowest attendance first</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={onlyBehind} onChange={(e) => setOnlyBehind(e.target.checked)} />
              Only below 75%
            </label>
          </div>
        )}

        {courses.length > 0 && shown.length === 0 && <p className="empty-note">No student matches these filters.</p>}

        {shown.length > 0 && (
          <div className="table-scroll">
            <div className="data-table data-table--wide">
              <div className="data-table__row data-table__row--head" style={columns}>
                <span>Student</span>
                <span>Batch</span>
                <span>Attendance in your courses</span>
                <span className="sr-only">Contact</span>
              </div>
              {shown.map((s) => (
                <div className="data-table__row" style={columns} key={s._id}>
                  <div>
                    <div className="strong">{s.name}</div>
                    <div className="register__meta">{s.rollNumber}</div>
                  </div>
                  <span className="register__meta">{s.batch}</span>
                  <div className="course-chips">
                    {s.courses
                      .filter((c) => courseId === 'all' || c.course._id === courseId)
                      .map((c) => (
                        <Link
                          key={c.course._id}
                          to={`/teacher/courses?course=${c.course._id}`}
                          className={`course-chip ${c.ok ? '' : 'is-low'}`}
                          title={
                            c.held
                              ? `${c.course.name}: attended ${c.attended} of ${c.held}${c.ok ? '' : `, needs the next ${c.toRecover}`}`
                              : `${c.course.name}: no classes yet`
                          }
                        >
                          {c.course.code} <strong>{c.percent === null ? '—' : `${c.percent}%`}</strong>
                        </Link>
                      ))}
                  </div>
                  <a className="panel__link" href={`mailto:${s.email}`}>
                    Email
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </>
  )
}
