import { useState } from 'react'
import { api } from '../../services/api.js'
import { downloadCsv, readStudentCsv } from '../../utils/csv.js'

const MAX_ROWS = 300
const previewColumns = (withProblems) => ({
  gridTemplateColumns: `56px 1.3fr 1.6fr 1fr 0.9fr${withProblems ? ' 1.6fr' : ''}`,
})
const doneColumns = { gridTemplateColumns: '1.4fr 1fr 1.6fr 1fr' }

// Adds a whole class from a CSV file: pick the batch, choose the file, check the rows, add them all at once.
export default function ImportStudents({ token, departments, batches, onImported }) {
  const [department, setDepartment] = useState('')
  const [batch, setBatch] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileKey, setFileKey] = useState(0) // changing this empties the file picker
  const [students, setStudents] = useState(null)
  const [problems, setProblems] = useState({}) // list position -> messages
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const deptBatches = batches.filter((b) => (b.department?._id ?? b.department) === department)
  const batchName = () => {
    const b = batches.find((x) => x._id === batch)
    return b ? `${b.department?.code ?? ''} ${b.name}`.trim() : ''
  }
  const problemCount = Object.keys(problems).length
  const tooMany = students && students.length > MAX_ROWS

  function clear() {
    setStudents(null)
    setProblems({})
    setError('')
    setFileName('')
    setFileKey((k) => k + 1)
  }

  async function chooseFile(event) {
    const file = event.target.files?.[0]
    setProblems({})
    setError('')
    setResult(null)
    setStudents(null)
    if (!file) return
    setFileName(file.name)
    if (!/\.csv$/i.test(file.name)) {
      setError('Please choose a .csv file. In Excel, use File > Save As > CSV.')
      return
    }
    const read = readStudentCsv(await file.text())
    if (read.error) setError(read.error)
    else setStudents(read.students)
  }

  async function addAll() {
    setError('')
    setProblems({})
    setSaving(true)
    try {
      const data = await api('/users/import', { method: 'POST', token, body: { batch, students } })
      setResult({ ...data, batchLabel: batchName() })
      setStudents(null)
      setFileName('')
      setFileKey((k) => k + 1)
      onImported()
    } catch (err) {
      setError(err.message)
      // Show each problem next to its row in the preview
      const byRow = {}
      for (const p of err.data?.problems ?? []) (byRow[p.index] ??= []).push(p.message)
      setProblems(byRow)
    } finally {
      setSaving(false)
    }
  }

  function downloadPasswords() {
    downloadCsv(`passwords-${result.batchLabel.replace(/\s+/g, '-')}.csv`, [
      ['Name', 'Roll number', 'Email', 'Temporary password'],
      ...result.students.map((s) => [s.name, s.rollNumber, s.email, s.tempPassword]),
    ])
  }

  function downloadSample() {
    downloadCsv('students-sample.csv', [
      ['Name', 'Email', 'Roll number', 'Phone'],
      ['Riya Sharma', 'riya.sharma@college.edu', 'PST-25-0101', '9876543210'],
      ['Aman Patel', 'aman.patel@college.edu', 'PST-25-0102', ''],
    ])
  }

  return (
    <div className="import">
      <p className="import__help">
        The first row of the file needs the column names <strong>Name</strong>, <strong>Email</strong> and{' '}
        <strong>Roll number</strong>. <strong>Phone</strong> is optional. In Excel, use File &gt; Save As &gt; CSV.{' '}
        <button type="button" className="link-btn" onClick={downloadSample}>
          Download a sample file
        </button>
      </p>

      <div className="form-grid">
        <label className="field">
          Department
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value)
              setBatch('')
            }}
          >
            <option value="">Pick a department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Batch
          <select value={batch} onChange={(e) => setBatch(e.target.value)} disabled={!department}>
            <option value="">{department ? 'Pick a batch' : 'Pick a department first'}</option>
            {deptBatches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          CSV file
          <input key={fileKey} type="file" accept=".csv,text/csv" onChange={chooseFile} />
        </label>
      </div>

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      {students && (
        <>
          <div className="import__summary">
            <span>
              <strong>{students.length}</strong> {students.length === 1 ? 'student' : 'students'} found in {fileName}
              {problemCount > 0 && (
                <span className="import__bad">
                  {' '}
                  · {problemCount} {problemCount === 1 ? 'row needs' : 'rows need'} fixing
                </span>
              )}
            </span>
            {tooMany && <span className="import__bad">You can add up to {MAX_ROWS} at a time. Split the file.</span>}
          </div>

          <div className="import__preview">
            <div className="data-table data-table--import">
              <div className="data-table__row data-table__row--head" style={previewColumns(problemCount > 0)}>
                <span>Row</span>
                <span>Name</span>
                <span>Email</span>
                <span>Roll number</span>
                <span>Phone</span>
                {problemCount > 0 && <span>Problem</span>}
              </div>
              {students.map((s, i) => (
                <div
                  key={s.row}
                  className={`data-table__row ${problems[i] ? 'is-problem' : ''}`}
                  style={previewColumns(problemCount > 0)}
                >
                  <span className="muted">{s.row}</span>
                  <span>{s.name || <em className="import__bad">missing</em>}</span>
                  <span className="import__cell">{s.email || <em className="import__bad">missing</em>}</span>
                  <span>{s.rollNumber || <em className="import__bad">missing</em>}</span>
                  <span>{s.phone}</span>
                  {problemCount > 0 && <span className="import__bad">{problems[i]?.join('. ')}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="form__actions">
            <button type="button" className="btn btn--outline btn--quiet" onClick={clear} disabled={saving}>
              Clear
            </button>
            <button type="button" className="btn btn--primary" onClick={addAll} disabled={!batch || saving || tooMany}>
              {saving
                ? 'Adding...'
                : batch
                  ? `Add ${students.length} ${students.length === 1 ? 'student' : 'students'} to ${batchName()}`
                  : 'Pick a batch first'}
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="import__done" role="status">
          <div className="temp-password">
            <span>
              Added <strong>{result.added}</strong> students to <strong>{result.batchLabel}</strong>. Download their
              temporary passwords now, they are shown only once. Each student must change theirs on first login.
            </span>
            <button type="button" className="btn btn--primary" onClick={downloadPasswords}>
              Download passwords
            </button>
            <button type="button" className="btn btn--outline btn--quiet" onClick={() => setResult(null)}>
              Done
            </button>
          </div>
          <div className="import__preview">
            <div className="data-table data-table--import">
              <div className="data-table__row data-table__row--head" style={doneColumns}>
                <span>Name</span>
                <span>Roll number</span>
                <span>Email</span>
                <span>Temporary password</span>
              </div>
              {result.students.map((s) => (
                <div key={s.rollNumber} className="data-table__row" style={doneColumns}>
                  <span>{s.name}</span>
                  <span>{s.rollNumber}</span>
                  <span className="import__cell">{s.email}</span>
                  <code>{s.tempPassword}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
