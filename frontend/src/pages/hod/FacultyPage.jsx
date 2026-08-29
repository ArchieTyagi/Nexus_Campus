import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import AttendanceMeter from '../../components/dashboard/AttendanceMeter.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

const courseColumns = { gridTemplateColumns: 'minmax(190px, 1.6fr) minmax(110px, 1fr) 60px minmax(160px, 1.3fr) 80px' }

// HOD: every teacher in the department, what they teach, and how their classes are attending
export default function FacultyPage() {
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
  if (!data) return <div className="auth-loading">Loading faculty...</div>

  const hours = data.faculty.reduce((n, t) => n + t.hours, 0)
  const held = data.faculty.reduce((n, t) => n + t.classesHeld, 0)

  return (
    <>
      <PageHeader
        kicker="Faculty"
        title={data.me.department.name}
        subtitle="Every teacher in your department, what they teach, and how their classes are attending."
        stats={[
          { label: 'Teachers', value: String(data.faculty.length), note: 'active' },
          { label: 'Teaching hours', value: `${Math.round(hours * 10) / 10} h`, note: 'a week, from the timetable' },
          { label: 'Classes held', value: String(held), note: 'with attendance taken' },
        ]}
      />

      {data.faculty.length === 0 && (
        <Panel>
          <p className="empty-note">No teachers in this department yet. The admin adds them in Users.</p>
        </Panel>
      )}

      {data.faculty.map((t) => (
        <Panel
          key={t._id}
          title={t.isHod ? `${t.name} (HOD)` : t.name}
          description={`${t.employeeId}, ${t.hours} hours a week, ${t.classesHeld} ${t.classesHeld === 1 ? 'class' : 'classes'} held`}
          action={
            <a className="panel__link" href={`mailto:${t.email}`}>
              Email
            </a>
          }
        >
          {t.courses.length === 0 ? (
            <p className="empty-note">Not teaching any course in this department yet.</p>
          ) : (
            <div className="table-scroll">
              <div className="data-table">
                <div className="data-table__row data-table__row--head" style={courseColumns}>
                  <span>Course</span>
                  <span>Batch</span>
                  <span>Held</span>
                  <span>Class average</span>
                  <span>Below 75%</span>
                </div>
                {t.courses.map((c) => (
                  <div className="data-table__row" style={courseColumns} key={c._id}>
                    <div>
                      <div className="strong">{c.name}</div>
                      <div className="register__meta">{c.code}</div>
                    </div>
                    <span className="register__meta">{c.batch}</span>
                    <span>{c.held}</span>
                    {c.average === null ? (
                      <span className="muted">No classes yet</span>
                    ) : (
                      <AttendanceMeter percent={c.average} />
                    )}
                    <span className={c.below ? 'text-red strong' : 'muted'}>
                      {c.below} of {c.students}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      ))}
    </>
  )
}
