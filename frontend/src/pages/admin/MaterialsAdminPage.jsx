import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import MaterialRow from '../../components/materials/MaterialRow.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { groupBySubject } from '../../utils/materials.js'
import { onlyMine, canEdit } from '../../utils/batches.js'

const batchLabel = (b) => `${b.department?.code ?? ''} ${b.name}`.trim()

export default function MaterialsAdminPage() {
  const { token, user } = useAuth()
  const [batches, setBatches] = useState([])
  const [items, setItems] = useState(null)
  const [batchId, setBatchId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/batches', { token }), api('/materials', { token })])
      .then(([allBatches, list]) => {
        setBatches(onlyMine(allBatches, user))
        setItems(list)
      })
      .catch((err) => setError(err.message))
  }, [token, user])

  const batch = batches.find((b) => b._id === batchId) ?? batches[0]
  const forBatch = (items ?? []).filter((m) => (m.batch?._id ?? m.batch) === batch?._id)
  const groups = groupBySubject(forBatch)

  return (
    <>
      <PageHeader
        kicker="Manage"
        title="Study material"
        subtitle="Upload the file to Google Drive, set sharing to “Anyone with the link”, then paste the link here."
        stats={[
          { label: 'Files', value: items ? items.length : '...', note: 'across all batches' },
          { label: 'This batch', value: items ? forBatch.length : '...', note: batch ? batchLabel(batch) : 'no batch yet' },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      {batches.length === 0 && items && (
        <Panel title="Add a batch first" description="Study material belongs to a batch. Create one in Departments and batches." />
      )}

      {batch && (
        <div className="columns">
          <div className="column column--wide">
            <Panel
              title={`Material for ${batchLabel(batch)}`}
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
              {groups.length === 0 && <p className="empty-note">Nothing added for this batch yet.</p>}
              {groups.map(([name, list]) => (
                <section key={name} className="material-group">
                  <h2 className="material-group__title">
                    {name} <span>{list.length}</span>
                  </h2>
                  {list.map((item) => (
                    <MaterialRow
                      key={item._id}
                      item={item}
                      actions={
                        canEdit(item, user) && (
                          <DeleteButton
                            id={item._id}
                            token={token}
                            onDeleted={() => setItems((all) => all.filter((m) => m._id !== item._id))}
                          />
                        )
                      }
                    />
                  ))}
                </section>
              ))}
            </Panel>
          </div>

          <div className="column">
            <Panel title={`Add to ${batchLabel(batch)}`}>
              <MaterialForm
                key={batch._id}
                token={token}
                batch={batch}
                subjects={groups.map(([name]) => name)}
                onAdded={(item) => setItems((all) => [item, ...all])}
              />
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}

function DeleteButton({ id, token, onDeleted }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      await api(`/materials/${id}`, { method: 'DELETE', token })
      onDeleted()
    } catch {
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button type="button" className="btn btn--outline btn--quiet" onClick={() => setConfirming(true)}>
        Delete
      </button>
    )
  }
  return (
    <>
      <button type="button" className="btn btn--outline" onClick={() => setConfirming(false)}>
        Keep
      </button>
      <button type="button" className="btn btn--danger" onClick={remove} disabled={busy}>
        Yes, delete
      </button>
    </>
  )
}

function MaterialForm({ token, batch, subjects, onAdded }) {
  const empty = { subject: '', title: '', link: '', note: '' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))
  const ready = form.subject.trim() && form.title.trim() && form.link.trim()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const item = await api('/materials', {
        method: 'POST',
        token,
        body: {
          batch: batch._id,
          subject: form.subject.trim(),
          title: form.title.trim(),
          link: form.link.trim(),
          note: form.note.trim() || undefined,
        },
      })
      onAdded(item)
      // Keep the subject, people usually add several files for one subject
      setForm({ ...empty, subject: form.subject })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="login__error" role="alert">{error}</p>}
      <label className="field">
        Subject
        <input value={form.subject} onChange={set('subject')} list="subject-options" placeholder="DSA" maxLength={80} required />
        <datalist id="subject-options">
          {subjects.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="field">
        Title
        <input value={form.title} onChange={set('title')} placeholder="Unit 1: Arrays and linked lists" maxLength={150} required />
      </label>
      <label className="field">
        Drive link
        <input type="url" value={form.link} onChange={set('link')} placeholder="https://drive.google.com/..." required />
      </label>
      <label className="field">
        Note (optional)
        <input value={form.note} onChange={set('note')} placeholder="Read before Monday's class" maxLength={300} />
      </label>
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !ready}>
          {saving ? 'Adding...' : 'Add material'}
        </button>
      </div>
    </form>
  )
}
