import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

const batchColumns = { gridTemplateColumns: 'minmax(160px, 2fr) 1fr 1fr' }
const thisYear = new Date().getFullYear()

export default function DepartmentsPage() {
  const { token } = useAuth()
  const [departments, setDepartments] = useState([])
  const [batches, setBatches] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/departments', { token }), api('/batches', { token })])
      .then(([depts, allBatches]) => {
        setDepartments(depts)
        setBatches(allBatches)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const selected = departments.find((d) => d._id === selectedId) ?? departments[0]
  const batchesOf = (deptId) => batches.filter((b) => (b.department?._id ?? b.department) === deptId)
  const selectedBatches = selected ? batchesOf(selected._id) : []

  function addDepartment(dept) {
    setDepartments((list) => [...list, dept].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedId(dept._id)
  }

  function addBatch(batch) {
    setBatches((list) => [batch, ...list])
  }

  return (
    <>
      <PageHeader
        kicker="Manage"
        title="Departments and batches"
        subtitle="Set these up first. Every student, teacher and course belongs to one of them."
        stats={[
          { label: 'Departments', value: departments.length, note: 'in the college' },
          { label: 'Batches', value: batches.length, note: 'across all departments' },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <div className="columns">
        <div className="column">
          <Panel title="Departments" description="Pick one to see its batches.">
            {loading && <p className="empty-note">Loading...</p>}
            {!loading && departments.length === 0 && (
              <p className="empty-note">No departments yet. Add the first one below.</p>
            )}
            <ul className="pick-list">
              {departments.map((dept) => (
                <li key={dept._id}>
                  <button
                    type="button"
                    className={`pick-list__item ${selected?._id === dept._id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(dept._id)}
                    aria-pressed={selected?._id === dept._id}
                  >
                    <span className="tag">{dept.code}</span>
                    <span className="pick-list__name">{dept.name}</span>
                    <span className="pick-list__count">
                      {batchesOf(dept._id).length} {batchesOf(dept._id).length === 1 ? 'batch' : 'batches'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Add a department">
            <DepartmentForm token={token} onAdded={addDepartment} />
          </Panel>
        </div>

        <div className="column column--wide">
          <Panel
            title={selected ? `Batches in ${selected.name}` : 'Batches'}
            description={selected ? 'A batch is one group of students who joined together.' : 'Add a department first.'}
          >
            {selected && selectedBatches.length === 0 && (
              <p className="empty-note">No batches in this department yet.</p>
            )}
            {selectedBatches.length > 0 && (
              <div className="table-scroll">
                <div className="data-table data-table--compact">
                  <div className="data-table__row data-table__row--head" style={batchColumns}>
                    <span>Batch</span>
                    <span>Years</span>
                    <span>Semester now</span>
                  </div>
                  {selectedBatches.map((batch) => (
                    <div className="data-table__row" style={batchColumns} key={batch._id}>
                      <strong>{batch.name}</strong>
                      <span>
                        {batch.startYear} to {batch.endYear}
                      </span>
                      <span>Sem {batch.currentSemester}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {selected && (
            <Panel title={`Add a batch to ${selected.code}`}>
              <BatchForm token={token} department={selected} onAdded={addBatch} />
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}

function DepartmentForm({ token, onAdded }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const dept = await api('/departments', { method: 'POST', token, body: { name: name.trim(), code: code.trim() } })
      onAdded(dept)
      setName('')
      setCode('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="login__error" role="alert">{error}</p>}
      <div className="form-row">
        <label className="field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Computer Science" required />
        </label>
        <label className="field field--short">
          Code
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CSE" maxLength={10} required />
        </label>
      </div>
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !name.trim() || !code.trim()}>
          {saving ? 'Adding...' : 'Add department'}
        </button>
      </div>
    </form>
  )
}

function BatchForm({ token, department, onAdded }) {
  const [name, setName] = useState('')
  const [startYear, setStartYear] = useState(String(thisYear))
  const [endYear, setEndYear] = useState(String(thisYear + 4))
  const [semester, setSemester] = useState('1')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const batch = await api('/batches', {
        method: 'POST',
        token,
        body: {
          name: name.trim(),
          department: department._id,
          startYear: Number(startYear),
          endYear: Number(endYear),
          currentSemester: Number(semester),
        },
      })
      onAdded(batch)
      setName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="login__error" role="alert">{error}</p>}
      <div className="form-row form-row--four">
        <label className="field">
          Batch name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="2025-2029 Sec A" required />
        </label>
        <label className="field">
          Start year
          <input type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)} required />
        </label>
        <label className="field">
          End year
          <input type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} required />
        </label>
        <label className="field">
          Semester now
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            {Array.from({ length: 8 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Sem {i + 1}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !name.trim()}>
          {saving ? 'Adding...' : 'Add batch'}
        </button>
      </div>
    </form>
  )
}
