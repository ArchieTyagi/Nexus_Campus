import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import NoticeCard from '../../components/notices/NoticeCard.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

export default function NoticesAdminPage() {
  const { token } = useAuth()
  const [notices, setNotices] = useState(null)
  const [departments, setDepartments] = useState([])
  const [batches, setBatches] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/notices', { token }), api('/departments', { token }), api('/batches', { token })])
      .then(([list, depts, allBatches]) => {
        setNotices(list)
        setDepartments(depts)
        setBatches(allBatches)
      })
      .catch((err) => setError(err.message))
  }, [token])

  const sortNotices = (list) =>
    [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt))

  const added = (notice) => setNotices((list) => sortNotices([notice, ...list]))
  const replaced = (notice) => setNotices((list) => sortNotices(list.map((n) => (n._id === notice._id ? notice : n))))
  const removed = (id) => setNotices((list) => list.filter((n) => n._id !== id))

  return (
    <>
      <PageHeader
        kicker="Communicate"
        title="Notices"
        subtitle="Post to the whole college, one department or one batch. Students can read but not reply."
        stats={[
          { label: 'Posted', value: notices ? notices.length : '...', note: 'in total' },
          { label: 'Pinned', value: notices ? notices.filter((n) => n.pinned).length : '...', note: 'stay on top' },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <div className="columns">
        <div className="column column--wide">
          <Panel title="Posted notices">
            {notices && notices.length === 0 && <p className="empty-note">Nothing posted yet.</p>}
            <div className="notice-list">
              {notices?.map((notice) => (
                <NoticeCard
                  key={notice._id}
                  notice={notice}
                  actions={<NoticeActions notice={notice} token={token} onChanged={replaced} onDeleted={removed} />}
                />
              ))}
            </div>
          </Panel>
        </div>

        <div className="column">
          <Panel title="Post a notice">
            <NoticeForm token={token} departments={departments} batches={batches} onPosted={added} />
          </Panel>
        </div>
      </div>
    </>
  )
}

function NoticeActions({ notice, token, onChanged, onDeleted }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function togglePin() {
    setBusy(true)
    try {
      onChanged(await api(`/notices/${notice._id}`, { method: 'PATCH', token, body: { pinned: !notice.pinned } }))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await api(`/notices/${notice._id}`, { method: 'DELETE', token })
      onDeleted(notice._id)
    } catch {
      setBusy(false)
    }
  }

  return (
    <span className="notice__actions">
      <button type="button" className="btn btn--outline" onClick={togglePin} disabled={busy}>
        {notice.pinned ? 'Unpin' : 'Pin'}
      </button>
      {confirming ? (
        <>
          <button type="button" className="btn btn--outline" onClick={() => setConfirming(false)}>
            Keep
          </button>
          <button type="button" className="btn btn--danger" onClick={remove} disabled={busy}>
            Yes, delete
          </button>
        </>
      ) : (
        <button type="button" className="btn btn--outline btn--quiet" onClick={() => setConfirming(true)}>
          Delete
        </button>
      )}
    </span>
  )
}

function NoticeForm({ token, departments, batches, onPosted }) {
  const empty = { title: '', body: '', link: '', audience: 'all', department: '', batch: '', important: false, pinned: false }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const batchLabel = (b) => `${b.department?.code ?? ''} ${b.name}`.trim()
  const ready =
    form.title.trim() &&
    form.body.trim() &&
    (form.audience !== 'department' || form.department) &&
    (form.audience !== 'batch' || form.batch)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(),
        body: form.body.trim(),
        link: form.link.trim() || undefined,
        audience: form.audience,
        important: form.important,
        pinned: form.pinned,
      }
      if (form.audience === 'department') body.department = form.department
      if (form.audience === 'batch') body.batch = form.batch
      onPosted(await api('/notices', { method: 'POST', token, body }))
      setForm(empty)
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
        Title
        <input value={form.title} onChange={set('title')} placeholder="OJT viva schedule" maxLength={150} required />
      </label>
      <label className="field">
        Message
        <textarea value={form.body} onChange={set('body')} rows={6} maxLength={5000} required />
      </label>
      <label className="field">
        Link (optional)
        <input type="url" value={form.link} onChange={set('link')} placeholder="https://..." />
      </label>
      <label className="field">
        Who is it for?
        <select value={form.audience} onChange={set('audience')}>
          <option value="all">Whole college</option>
          <option value="department">One department</option>
          <option value="batch">One batch</option>
        </select>
      </label>
      {form.audience === 'department' && (
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
      {form.audience === 'batch' && (
        <label className="field">
          Batch
          <select value={form.batch} onChange={set('batch')} required>
            <option value="">Pick a batch</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {batchLabel(b)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="check-row">
        <label className="check">
          <input type="checkbox" checked={form.important} onChange={set('important')} />
          Important
        </label>
        <label className="check">
          <input type="checkbox" checked={form.pinned} onChange={set('pinned')} />
          Pin to top
        </label>
      </div>
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !ready}>
          {saving ? 'Posting...' : 'Post notice'}
        </button>
      </div>
    </form>
  )
}
