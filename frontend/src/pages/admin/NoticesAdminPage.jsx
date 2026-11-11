import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import NoticeCard from '../../components/notices/NoticeCard.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import AudienceFields from '../../components/forms/AudienceFields.jsx'
import { audienceBody, audienceReady } from '../../utils/audience.js'
import { onlyMine, isBatchManager, canEdit } from '../../utils/batches.js'

export default function NoticesAdminPage() {
  const { token, user } = useAuth()
  const [notices, setNotices] = useState(null)
  const [departments, setDepartments] = useState([])
  const [batches, setBatches] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/notices', { token }), api('/departments', { token }), api('/batches', { token })])
      .then(([list, depts, allBatches]) => {
        setNotices(list)
        setDepartments(depts)
        setBatches(onlyMine(allBatches, user))
      })
      .catch((err) => setError(err.message))
  }, [token, user])

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
                  actions={
                    canEdit(notice, user) && (
                      <NoticeActions notice={notice} token={token} onChanged={replaced} onDeleted={removed} />
                    )
                  }
                />
              ))}
            </div>
          </Panel>
        </div>

        <div className="column">
          <Panel title="Post a notice">
            <NoticeForm
              token={token}
              departments={departments}
              batches={batches}
              batchOnly={isBatchManager(user)}
              onPosted={added}
            />
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

function NoticeForm({ token, departments, batches, batchOnly, onPosted }) {
  const empty = {
    title: '',
    body: '',
    link: '',
    audience: batchOnly ? 'batch' : 'all',
    department: '',
    batch: '',
    ojt: false,
    important: false,
    pinned: false,
  }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const ready = form.title.trim() && form.body.trim() && audienceReady(form)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(),
        body: form.body.trim(),
        link: form.link.trim() || undefined,
        ...audienceBody(form),
        category: form.ojt ? 'ojt' : 'general',
        important: form.important,
        pinned: form.pinned,
      }
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
      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}
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
      <AudienceFields form={form} set={set} departments={departments} batches={batches} batchOnly={batchOnly} />
      <div className="check-row">
        <label className="check">
          <input type="checkbox" checked={form.important} onChange={set('important')} />
          Important
        </label>
        <label className="check">
          <input type="checkbox" checked={form.pinned} onChange={set('pinned')} />
          Pin to top
        </label>
        <label className="check">
          <input type="checkbox" checked={form.ojt} onChange={set('ojt')} />
          OJT announcement
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
