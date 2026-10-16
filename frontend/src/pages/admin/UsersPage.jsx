import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import ImportStudents from '../../components/users/ImportStudents.jsx'

const ROLE_LABELS = {
  admin: 'Admin',
  hod: 'HOD',
  batch_manager: 'Batch manager',
  teacher: 'Teacher',
  student: 'Student',
}
const userColumns = { gridTemplateColumns: 'minmax(220px, 2fr) 0.8fr 1.4fr 0.9fr minmax(250px, 1.6fr)' }

export default function UsersPage() {
  const { token, user: me } = useAuth()
  const [departments, setDepartments] = useState([])
  const [batches, setBatches] = useState([])
  const [filters, setFilters] = useState({ search: '', role: '', department: '', page: 1 })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    Promise.all([api('/departments', { token }), api('/batches', { token })])
      .then(([depts, allBatches]) => {
        setDepartments(depts)
        setBatches(allBatches)
      })
      .catch((err) => setError(err.message))
  }, [token])

  // Wait a moment after typing before searching, so we don't call the server on every key
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search.trim()) params.set('search', filters.search.trim())
    if (filters.role) params.set('role', filters.role)
    if (filters.department) params.set('department', filters.department)
    params.set('page', filters.page)
    const timer = setTimeout(() => {
      api(`/users?${params}`, { token })
        .then(setResult)
        .catch((err) => setError(err.message))
    }, 250)
    return () => clearTimeout(timer)
  }, [token, filters, reload])

  const setFilter = (key) => (event) => setFilters((f) => ({ ...f, [key]: event.target.value, page: 1 }))
  const replaceUser = (updated) =>
    setResult((r) => ({ ...r, users: r.users.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)) }))

  return (
    <>
      <PageHeader
        kicker="Manage"
        title="Users"
        subtitle="Add students, teachers and HODs. Each new person gets a temporary password to share with them."
        stats={[
          {
            label: 'Showing',
            value: result ? result.total : '...',
            note: filters.role ? `${ROLE_LABELS[filters.role]}s` : 'everyone',
          },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <Panel
        title="Add a person"
        description="Role, department and batch stay filled in, so adding a whole class is quick."
      >
        <AddUserForm
          token={token}
          departments={departments}
          batches={batches}
          onAdded={() => setReload((n) => n + 1)}
        />
      </Panel>

      <Panel title="Import a class" description="Add a whole batch of students at once from a CSV file.">
        <ImportStudents
          token={token}
          departments={departments}
          batches={batches}
          onImported={() => setReload((n) => n + 1)}
        />
      </Panel>

      <Panel title="People">
        <div className="filter-row">
          <label className="search search--light">
            <Icon name="search" size={18} />
            <span className="sr-only">Search</span>
            <input
              type="search"
              placeholder="Name, email or roll number"
              value={filters.search}
              onChange={setFilter('search')}
            />
          </label>
          <label className="field field--inline">
            <span className="sr-only">Role</span>
            <select value={filters.role} onChange={setFilter('role')}>
              <option value="">All roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline">
            <span className="sr-only">Department</span>
            <select value={filters.department} onChange={setFilter('department')}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code}
                </option>
              ))}
            </select>
          </label>
        </div>

        {result && result.users.length === 0 && <p className="empty-note">No one matches these filters.</p>}

        {result && result.users.length > 0 && (
          <div className="table-scroll">
            <div className="data-table data-table--users">
              <div className="data-table__row data-table__row--head" style={userColumns}>
                <span>Person</span>
                <span>Role</span>
                <span>Department and ID</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {result.users.map((person) => (
                <UserRow
                  key={person._id}
                  person={person}
                  isMe={person._id === me?._id}
                  token={token}
                  onChanged={replaceUser}
                />
              ))}
            </div>
          </div>
        )}

        {result && result.pages > 1 && (
          <div className="pager">
            <button
              type="button"
              className="btn btn--outline"
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              Previous
            </button>
            <span>
              Page {result.page} of {result.pages}
            </span>
            <button
              type="button"
              className="btn btn--outline"
              disabled={filters.page >= result.pages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Next
            </button>
          </div>
        )}
      </Panel>
    </>
  )
}

function profileLine(person) {
  const p = person.profile
  if (!p) return '—'
  if (person.role === 'batch_manager') {
    return p.batches?.length
      ? `Manages ${p.batches.map((b) => `${b.department?.code ?? ''} ${b.name}`.trim()).join(', ')}`
      : 'No batches yet'
  }
  if (person.role === 'student') return `${p.department?.code ?? ''} ${p.batch?.name ?? ''} · ${p.rollNumber}`
  return `${p.department?.code ?? ''} · ${p.employeeId}`
}

function UserRow({ person, isMe, token, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [error, setError] = useState('')

  async function patch(body) {
    setError('')
    setBusy(true)
    try {
      const { user } = await api(`/users/${person._id}`, { method: 'PATCH', token, body })
      onChanged(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    setError('')
    setBusy(true)
    try {
      const data = await api(`/users/${person._id}/reset-password`, { method: 'POST', token })
      setTempPassword(data.tempPassword)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const isStaff = person.role === 'teacher' || person.role === 'hod'

  return (
    <div className={`data-table__row ${person.isActive ? '' : 'is-inactive'}`} style={userColumns}>
      <span className="user-cell">
        <strong>{person.name}</strong>
        <span>{person.email}</span>
      </span>
      <span>
        <span className={`role-tag role-tag--${person.role}`}>{ROLE_LABELS[person.role]}</span>
      </span>
      <span className="user-cell__muted">{profileLine(person)}</span>
      <span>{person.isActive ? 'Active' : 'Deactivated'}</span>
      <span className="user-actions">
        {isStaff && (
          <button
            type="button"
            className="btn btn--outline"
            disabled={busy}
            onClick={() => patch({ role: person.role === 'hod' ? 'teacher' : 'hod' })}
          >
            {person.role === 'hod' ? 'Make teacher' : 'Make HOD'}
          </button>
        )}
        <button type="button" className="btn btn--outline" disabled={busy} onClick={resetPassword}>
          Reset password
        </button>
        {!isMe && (
          <button
            type="button"
            className="btn btn--outline btn--quiet"
            disabled={busy}
            onClick={() => patch({ isActive: !person.isActive })}
          >
            {person.isActive ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </span>
      {tempPassword && <TempPassword password={tempPassword} name={person.name} onClose={() => setTempPassword('')} />}
      {error && (
        <p className="login__error user-row__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function TempPassword({ password, name, onClose }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="temp-password" role="status">
      <span>
        Temporary password for <strong>{name}</strong>. It is shown only once, share it now.
      </span>
      <code>{password}</code>
      <button type="button" className="btn btn--outline" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <button type="button" className="btn btn--outline btn--quiet" onClick={onClose}>
        Done
      </button>
    </div>
  )
}

function AddUserForm({ token, departments, batches, onAdded }) {
  const empty = {
    role: 'student',
    name: '',
    email: '',
    phone: '',
    rollNumber: '',
    employeeId: '',
    department: '',
    batch: '',
    manages: [],
  }
  const [form, setForm] = useState(empty)
  const [created, setCreated] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => {
    const value = event.target.value
    setForm((f) => ({ ...f, [key]: value, ...(key === 'department' ? { batch: '' } : {}) }))
  }

  const isStudent = form.role === 'student'
  const isStaff = form.role === 'teacher' || form.role === 'hod'
  const isManager = form.role === 'batch_manager'
  const toggleManaged = (id) =>
    setForm((f) => ({ ...f, manages: f.manages.includes(id) ? f.manages.filter((x) => x !== id) : [...f.manages, id] }))
  const deptBatches = batches.filter((b) => (b.department?._id ?? b.department) === form.department)
  const ready =
    form.name.trim() &&
    form.email.trim() &&
    (!isStudent || (form.rollNumber.trim() && form.department && form.batch)) &&
    (!isStaff || (form.employeeId.trim() && form.department)) &&
    (!isManager || form.manages.length > 0)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = { role: form.role, name: form.name.trim(), email: form.email.trim() }
      if (form.phone.trim()) body.phone = form.phone.trim()
      if (isStudent)
        Object.assign(body, { rollNumber: form.rollNumber.trim(), department: form.department, batch: form.batch })
      if (isStaff) Object.assign(body, { employeeId: form.employeeId.trim(), department: form.department })
      if (isManager) body.batches = form.manages
      const data = await api('/users', { method: 'POST', token, body })
      setCreated({ name: data.user.name, password: data.tempPassword })
      // Keep role, department and batch so adding a whole class is quick
      setForm((f) => ({ ...empty, role: f.role, department: f.department, batch: f.batch }))
      onAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {created && <TempPassword password={created.password} name={created.name} onClose={() => setCreated(null)} />}
      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}
      <div className="form-grid">
        <label className="field">
          Role
          <select value={form.role} onChange={set('role')}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Full name
          <input value={form.name} onChange={set('name')} required />
        </label>
        <label className="field">
          College email
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label className="field">
          Phone (optional)
          <input type="tel" value={form.phone} onChange={set('phone')} />
        </label>
        {(isStudent || isStaff) && (
          <label className="field">
            Department
            <select value={form.department} onChange={set('department')} required>
              <option value="">Pick a department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {isStudent && (
          <>
            <label className="field">
              Batch
              <select value={form.batch} onChange={set('batch')} required disabled={!form.department}>
                <option value="">{form.department ? 'Pick a batch' : 'Pick a department first'}</option>
                {deptBatches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Roll number
              <input value={form.rollNumber} onChange={set('rollNumber')} placeholder="PST-25-0074" required />
            </label>
          </>
        )}
        {isStaff && (
          <label className="field">
            Employee ID
            <input value={form.employeeId} onChange={set('employeeId')} placeholder="EMP-104" required />
          </label>
        )}
      </div>
      {isManager && (
        <fieldset className="batch-picker">
          <legend>Batches they manage</legend>
          {batches.length === 0 && <p className="empty-note">Add a batch first in Departments and batches.</p>}
          {batches.map((b) => (
            <label key={b._id} className="check">
              <input type="checkbox" checked={form.manages.includes(b._id)} onChange={() => toggleManaged(b._id)} />
              {`${b.department?.code ?? ''} ${b.name}`.trim()}
              {b.manager && <span className="batch-picker__note">(has a manager, will move to this person)</span>}
            </label>
          ))}
        </fieldset>
      )}
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !ready}>
          {saving ? 'Adding...' : `Add ${ROLE_LABELS[form.role].toLowerCase()}`}
        </button>
      </div>
    </form>
  )
}
