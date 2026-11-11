import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

const columns = { gridTemplateColumns: '0.9fr minmax(180px, 1.6fr) minmax(200px, 1.6fr) 1fr 0.7fr' }
const batchLabel = (b) => `${b.department?.code ?? ''} ${b.name}`.trim()

export default function BatchStudentsPage() {
  const { token, profile } = useAuth()
  const batches = profile?.batches ?? []
  const [batchId, setBatchId] = useState('')
  const [students, setStudents] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const batch = batches.find((b) => b._id === batchId) ?? batches[0]

  useEffect(() => {
    if (!batch) return
    api(`/batches/${batch._id}/students`, { token })
      .then(setStudents)
      .catch((err) => setError(err.message))
  }, [token, batch])

  const text = search.trim().toLowerCase()
  const shown = (students ?? []).filter(
    (s) => !text || `${s.user?.name} ${s.rollNumber} ${s.user?.email}`.toLowerCase().includes(text),
  )

  return (
    <>
      <PageHeader
        kicker="Batch manager"
        title="Students"
        subtitle={
          batches.length
            ? `You look after ${batches.map(batchLabel).join(', ')}.`
            : 'No batches are assigned to you yet. Ask the admin to assign them in Users.'
        }
        stats={[
          { label: 'Batches', value: batches.length, note: 'you manage' },
          { label: 'Students', value: students ? students.length : '...', note: batch ? batchLabel(batch) : '' },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      {batch && (
        <Panel
          title={`Students in ${batchLabel(batch)}`}
          action={
            batches.length > 1 && (
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
            )
          }
        >
          <div className="filter-row">
            <label className="search search--light">
              <Icon name="search" size={18} />
              <span className="sr-only">Search</span>
              <input
                type="search"
                placeholder="Name, roll number or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          {students && shown.length === 0 && <p className="empty-note">No students match.</p>}
          {shown.length > 0 && (
            <div className="table-scroll">
              <div className="data-table data-table--courses">
                <div className="data-table__row data-table__row--head" style={columns}>
                  <span>Roll number</span>
                  <span>Name</span>
                  <span>Email</span>
                  <span>Phone</span>
                  <span>Status</span>
                </div>
                {shown.map((s) => (
                  <div
                    className={`data-table__row ${s.user?.isActive ? '' : 'is-inactive'}`}
                    style={columns}
                    key={s._id}
                  >
                    <span className="tag">{s.rollNumber}</span>
                    <strong>{s.user?.name}</strong>
                    <a href={`mailto:${s.user?.email}`}>{s.user?.email}</a>
                    <span>{s.user?.phone || '—'}</span>
                    <span>{s.user?.isActive ? 'Active' : 'Left'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      )}
    </>
  )
}
