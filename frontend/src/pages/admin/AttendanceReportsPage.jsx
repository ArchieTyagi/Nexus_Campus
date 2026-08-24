import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import Icon from '../../components/ui/Icon.jsx'
import AttendanceMeter from '../../components/dashboard/AttendanceMeter.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { isLow } from '../../utils/attendance.js'
import { downloadCsv } from '../../utils/csv.js'

const subjectColumns = { gridTemplateColumns: 'minmax(220px, 2fr) 80px minmax(170px, 1.4fr) 90px' }
const pct = (a, h) => (h ? Math.round((a / h) * 100) : null)

// One row per student with their attendance in every subject of the batch
function buildGrid(reports) {
  const rows = new Map()
  for (const r of reports) {
    for (const s of r.students) {
      if (!rows.has(s._id)) rows.set(s._id, { ...s, cells: {}, attended: 0, held: 0 })
      const row = rows.get(s._id)
      row.cells[r.course._id] = s
      row.attended += s.attended
      row.held += r.held
    }
  }
  return [...rows.values()].map((row) => {
    const overall = pct(row.attended, row.held)
    return { ...row, overall, behind: Object.values(row.cells).some((c) => !c.ok) }
  })
}

// Admin: attendance of a whole batch, subject by subject and student by student
export default function AttendanceReportsPage() {
  const { token } = useAuth()
  const [departments, setDepartments] = useState([])
  const [batches, setBatches] = useState([])
  const [department, setDepartment] = useState('')
  const [batchId, setBatchId] = useState('')
  const [semester, setSemester] = useState('')
  const [courses, setCourses] = useState(null)
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')
  const [onlyBehind, setOnlyBehind] = useState(false)
  const [sortBy, setSortBy] = useState('roll')
  const [search, setSearch] = useState('')

  // Departments and batches once; start on the first batch
  useEffect(() => {
    Promise.all([api('/departments', { token }), api('/batches', { token })])
      .then(([depts, list]) => {
        setDepartments(depts)
        setBatches(list)
        if (list[0]) {
          setDepartment(list[0].department?._id ?? '')
          setBatchId(list[0]._id)
        }
      })
      .catch((err) => setError(err.message))
  }, [token])

  // The batch's courses, starting on its current semester
  useEffect(() => {
    if (!batchId) return
    let stale = false
    api(`/courses?batch=${batchId}`, { token })
      .then((list) => {
        if (stale) return
        const current = list[0]?.batch?.currentSemester
        setCourses(list)
        setSemester(String(list.some((c) => c.semester === current) ? current : (list[0]?.semester ?? '')))
      })
      .catch((err) => !stale && setError(err.message))
    return () => {
      stale = true
    }
  }, [token, batchId])

  // One attendance report per course of the chosen semester
  useEffect(() => {
    if (!courses || !semester) return
    let stale = false
    const chosen = courses.filter((c) => String(c.semester) === semester)
    Promise.all(chosen.map((c) => api(`/attendance/courses/${c._id}/report`, { token })))
      .then((list) => !stale && setReports(list.map((r, i) => ({ ...r, teacher: chosen[i].teacher?.user?.name }))))
      .catch((err) => !stale && setError(err.message))
    return () => {
      stale = true
    }
  }, [token, courses, semester])

  const deptBatches = batches.filter((b) => (b.department?._id ?? b.department) === department)
  const batch = batches.find((b) => b._id === batchId)
  const semesters = [...new Set((courses ?? []).map((c) => c.semester))].sort((a, b) => a - b)

  function pickDepartment(value) {
    setDepartment(value)
    const first = batches.find((b) => (b.department?._id ?? b.department) === value)
    pickBatch(first?._id ?? '')
  }

  function pickBatch(value) {
    setBatchId(value)
    setCourses(null)
    setReports(null)
    setSemester('')
  }

  function pickSemester(value) {
    setReports(null)
    setSemester(value)
  }

  const grid = reports ? buildGrid(reports) : []
  const text = search.trim().toLowerCase()
  const shown = grid
    .filter((r) => !onlyBehind || r.behind)
    .filter((r) => !text || r.name.toLowerCase().includes(text) || r.rollNumber.toLowerCase().includes(text))
    .sort((a, b) =>
      sortBy === 'low'
        ? (a.overall ?? 101) - (b.overall ?? 101) || a.rollNumber.localeCompare(b.rollNumber)
        : a.rollNumber.localeCompare(b.rollNumber),
    )
  const behindCount = grid.filter((r) => r.behind).length
  const totalHeld = reports ? reports.reduce((n, r) => n + r.held, 0) : 0
  const batchAverage = pct(
    grid.reduce((n, r) => n + r.attended, 0),
    grid.reduce((n, r) => n + r.held, 0),
  )
  const label = batch ? `${batch.department?.code ?? ''} ${batch.name}`.trim() : ''
  const studentColumns = {
    gridTemplateColumns: `minmax(190px, 1.4fr) ${(reports ?? []).map(() => '78px').join(' ')} 90px`,
  }

  function download() {
    downloadCsv(`attendance-${label.replace(/\s+/g, '-')}-sem-${semester}.csv`, [
      ['Roll number', 'Name', 'Email', ...reports.map((r) => `${r.course.code} %`), 'Overall %', 'Below 75% in'],
      ...shown.map((row) => [
        row.rollNumber,
        row.name,
        row.email,
        ...reports.map((r) => row.cells[r.course._id]?.percent ?? ''),
        row.overall ?? '',
        reports
          .filter((r) => row.cells[r.course._id] && !row.cells[r.course._id].ok)
          .map((r) => r.course.code)
          .join(' '),
      ]),
    ])
  }

  return (
    <>
      <PageHeader
        kicker="Reports"
        title="Attendance reports"
        subtitle="Pick a batch to see every subject and every student. Below 75% is shown in red."
        stats={
          reports
            ? [
                { label: 'Classes held', value: String(totalHeld), note: `across ${reports.length} subjects` },
                {
                  label: 'Batch average',
                  value: batchAverage === null ? '—' : `${batchAverage}%`,
                  note: label,
                  tone: batchAverage !== null && isLow(batchAverage) ? 'red' : undefined,
                },
                {
                  label: 'Below 75%',
                  value: String(behindCount),
                  note: behindCount ? 'students in at least one subject' : 'everyone is fine',
                  tone: behindCount ? 'red' : undefined,
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
          <span className="sr-only">Department</span>
          <select value={department} onChange={(e) => pickDepartment(e.target.value)}>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--inline">
          <span className="sr-only">Batch</span>
          <select value={batchId} onChange={(e) => pickBatch(e.target.value)} disabled={deptBatches.length === 0}>
            {deptBatches.length === 0 && <option value="">No batches</option>}
            {deptBatches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        {semesters.length > 0 && (
          <label className="field field--inline">
            <span className="sr-only">Semester</span>
            <select value={semester} onChange={(e) => pickSemester(e.target.value)}>
              {semesters.map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {batchId && courses && courses.length === 0 && (
        <Panel>
          <p className="empty-note">This batch has no subjects yet. Add them in Courses.</p>
        </Panel>
      )}

      {batchId && courses?.length > 0 && !reports && <div className="auth-loading">Loading the batch...</div>}

      {reports && (
        <>
          <Panel title="Subjects">
            <div className="table-scroll">
              <div className="data-table">
                <div className="data-table__row data-table__row--head" style={subjectColumns}>
                  <span>Subject</span>
                  <span>Held</span>
                  <span>Class average</span>
                  <span>Below 75%</span>
                </div>
                {reports.map((r) => (
                  <div className="data-table__row" style={subjectColumns} key={r.course._id}>
                    <div>
                      <div className="strong">{r.course.name}</div>
                      <div className="register__meta">
                        {r.course.code}, {r.teacher ?? 'no teacher assigned'}
                      </div>
                    </div>
                    <span>{r.held}</span>
                    {r.average === null ? (
                      <span className="muted">No classes yet</span>
                    ) : (
                      <AttendanceMeter percent={r.average} />
                    )}
                    <span className={r.below ? 'text-red strong' : 'muted'}>{r.below}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel
            title="Students"
            description="Each cell is that student's attendance in the subject. Overall counts every class held."
            action={
              grid.length > 0 && (
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
                  <option value="low">Lowest overall first</option>
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={onlyBehind} onChange={(e) => setOnlyBehind(e.target.checked)} />
                Only below 75%
              </label>
            </div>

            {grid.length === 0 && <p className="empty-note">No students in this batch yet.</p>}
            {grid.length > 0 && shown.length === 0 && <p className="empty-note">No student matches these filters.</p>}
            {shown.length > 0 && (
              <div className="table-scroll">
                <div className="data-table data-table--report">
                  <div className="data-table__row data-table__row--head" style={studentColumns}>
                    <span>Student</span>
                    {reports.map((r) => (
                      <span key={r.course._id} className="report__num" title={r.course.name}>
                        {r.course.code}
                      </span>
                    ))}
                    <span className="report__num">Overall</span>
                  </div>
                  {shown.map((row) => (
                    <div className="data-table__row" style={studentColumns} key={row._id}>
                      <div>
                        <div className="strong">{row.name}</div>
                        <div className="register__meta">{row.rollNumber}</div>
                      </div>
                      {reports.map((r) => {
                        const cell = row.cells[r.course._id]
                        return (
                          <span
                            key={r.course._id}
                            className={`report__num ${cell && !cell.ok ? 'text-red strong' : ''}`}
                            title={cell && r.held ? `Attended ${cell.attended} of ${r.held}` : 'No classes yet'}
                          >
                            {cell?.percent === null || !cell ? '—' : `${cell.percent}%`}
                          </span>
                        )
                      })}
                      <span
                        className={`report__num strong ${row.overall !== null && isLow(row.overall) ? 'text-red' : ''}`}
                      >
                        {row.overall === null ? '—' : `${row.overall}%`}
                      </span>
                    </div>
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
