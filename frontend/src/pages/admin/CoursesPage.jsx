import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

const courseColumns = { gridTemplateColumns: '0.8fr minmax(180px, 2fr) 0.5fr 0.6fr minmax(190px, 1.6fr) minmax(150px, 1fr)' }
const batchLabel = (b) => `${b.department?.code ?? ''} ${b.name}`.trim()
const deptOf = (b) => b?.department?._id ?? b?.department

export default function CoursesPage() {
  const { token } = useAuth()
  const [batches, setBatches] = useState([])
  const [teachers, setTeachers] = useState([])
  const [courses, setCourses] = useState(null)
  const [batchId, setBatchId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/batches', { token }), api('/users/teachers', { token }), api('/courses', { token })])
      .then(([allBatches, allTeachers, allCourses]) => {
        setBatches(allBatches)
        setTeachers(allTeachers)
        setCourses(allCourses)
      })
      .catch((err) => setError(err.message))
  }, [token])

  const batch = batches.find((b) => b._id === batchId) ?? batches[0]
  const batchCourses = (courses ?? []).filter((c) => (c.batch?._id ?? c.batch) === batch?._id)
  const deptTeachers = teachers.filter((t) => (t.department?._id ?? t.department) === deptOf(batch))
  const noTeacher = (courses ?? []).filter((c) => !c.teacher).length

  const replace = (course) => setCourses((list) => list.map((c) => (c._id === course._id ? course : c)))
  const sortCourses = (list) => [...list].sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code))

  return (
    <>
      <PageHeader
        kicker="Manage"
        title="Courses"
        subtitle="The subjects each batch studies, and who teaches them. Attendance and the timetable are built on these."
        stats={[
          { label: 'Courses', value: courses ? courses.length : '...', note: 'across all batches' },
          {
            label: 'Without a teacher',
            value: courses ? noTeacher : '...',
            note: noTeacher ? 'assign someone' : 'all assigned',
            tone: noTeacher ? 'amber' : undefined,
          },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      {courses && batches.length === 0 && (
        <Panel title="Add a batch first" description="Courses belong to a batch. Create one in Departments and batches." />
      )}

      {batch && (
        <>
          <Panel
            title={`Add a course to ${batchLabel(batch)}`}
            description={
              deptTeachers.length === 0
                ? `No teachers in ${batch.department?.name ?? 'this department'} yet. You can add the course now and assign a teacher later from Users.`
                : undefined
            }
            action={
              <label className="field field--inline">
                <span className="sr-only">Batch</span>
                <select value={batch._id} onChange={(e) => setBatchId(e.target.value)}>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {batchLabel(b)}
                    </option>
                  ))}
                </select>
              </label>
            }
          >
            <CourseForm
              key={batch._id}
              token={token}
              batch={batch}
              teachers={deptTeachers}
              onAdded={(course) => setCourses((list) => sortCourses([...list, course]))}
            />
          </Panel>

          <Panel title={`Courses in ${batchLabel(batch)}`}>
            {batchCourses.length === 0 && <p className="empty-note">No courses in this batch yet.</p>}
            {batchCourses.length > 0 && (
              <div className="table-scroll">
                <div className="data-table data-table--courses">
                  <div className="data-table__row data-table__row--head" style={courseColumns}>
                    <span>Code</span>
                    <span>Name</span>
                    <span>Sem</span>
                    <span>Credits</span>
                    <span>Teacher</span>
                    <span />
                  </div>
                  {batchCourses.map((course) => (
                    <CourseRow
                      key={course._id}
                      course={course}
                      teachers={deptTeachers}
                      token={token}
                      onChanged={replace}
                      onDeleted={() => setCourses((list) => list.filter((c) => c._id !== course._id))}
                    />
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  )
}

function CourseRow({ course, teachers, token, onChanged, onDeleted }) {
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  async function changeTeacher(event) {
    setError('')
    setBusy(true)
    try {
      onChanged(await api(`/courses/${course._id}`, { method: 'PATCH', token, body: { teacher: event.target.value || null } }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await api(`/courses/${course._id}`, { method: 'DELETE', token })
      onDeleted()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="data-table__row" style={courseColumns}>
      <span className="tag">{course.code}</span>
      <strong>{course.name}</strong>
      <span>{course.semester}</span>
      <span>{course.credits}</span>
      <label className="field field--inline">
        <span className="sr-only">Teacher for {course.code}</span>
        <select value={course.teacher?._id ?? ''} onChange={changeTeacher} disabled={busy}>
          <option value="">No teacher yet</option>
          {teachers.map((t) => (
            <option key={t._id} value={t._id}>
              {t.user.name}
              {t.user.role === 'hod' ? ' (HOD)' : ''}
            </option>
          ))}
        </select>
      </label>
      <span className="user-actions">
        {confirming ? (
          <>
            <button type="button" className="btn btn--outline" onClick={() => setConfirming(false)}>
              Keep
            </button>
            <button type="button" className="btn btn--danger" onClick={remove} disabled={busy}>
              Delete
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--outline btn--quiet" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </span>
      {confirming && (
        <p className="row-note">Deleting {course.code} also removes its classes from the timetable.</p>
      )}
      {error && <p className="login__error user-row__error" role="alert">{error}</p>}
    </div>
  )
}

function CourseForm({ token, batch, teachers, onAdded }) {
  const empty = { code: '', name: '', semester: String(batch.currentSemester ?? 1), credits: '3', teacher: '' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))
  const ready = form.code.trim() && form.name.trim()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const course = await api('/courses', {
        method: 'POST',
        token,
        body: {
          batch: batch._id,
          code: form.code.trim(),
          name: form.name.trim(),
          semester: Number(form.semester),
          credits: Number(form.credits),
          teacher: form.teacher || undefined,
        },
      })
      onAdded(course)
      setForm({ ...empty, semester: form.semester })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="login__error" role="alert">{error}</p>}
      <div className="form-grid">
        <label className="field">
          Code
          <input value={form.code} onChange={set('code')} placeholder="CS201" maxLength={12} required />
        </label>
        <label className="field">
          Name
          <input value={form.name} onChange={set('name')} placeholder="Data Structures" required />
        </label>
        <label className="field">
          Semester
          <select value={form.semester} onChange={set('semester')}>
            {Array.from({ length: 8 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Sem {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Credits
          <input type="number" min="0" max="10" value={form.credits} onChange={set('credits')} />
        </label>
        <label className="field">
          Teacher
          <select value={form.teacher} onChange={set('teacher')}>
            <option value="">Assign later</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.user.name}
                {t.user.role === 'hod' ? ' (HOD)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !ready}>
          {saving ? 'Adding...' : 'Add course'}
        </button>
      </div>
    </form>
  )
}
