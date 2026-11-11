import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import EventRow from '../../components/ojt/EventRow.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { UPDATE_STATUS, monthLabel } from '../../utils/ojt.js'
import { onlyMine, canEdit } from '../../utils/batches.js'

const batchLabel = (b) => `${b.department?.code ?? ''} ${b.name}`.trim()
const thisMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)

export default function OjtAdminPage() {
  const { token, user } = useAuth()
  const [batches, setBatches] = useState([])
  const [batchId, setBatchId] = useState('')
  const [events, setEvents] = useState(null)
  const [updates, setUpdates] = useState(null)
  const [month, setMonth] = useState(thisMonth)
  const [status, setStatus] = useState('submitted')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/batches', { token })
      .then((all) => setBatches(onlyMine(all, user)))
      .catch((err) => setError(err.message))
  }, [token, user])

  const batch = batches.find((b) => b._id === batchId) ?? batches[0]

  useEffect(() => {
    if (!batch) return
    api(`/ojt/events?batch=${batch._id}&upcoming=true`, { token })
      .then(setEvents)
      .catch((err) => setError(err.message))
  }, [token, batch])

  useEffect(() => {
    if (!batch) return
    const params = new URLSearchParams({ batch: batch._id, month })
    if (status) params.set('status', status)
    api(`/ojt/updates?${params}`, { token })
      .then(setUpdates)
      .catch((err) => setError(err.message))
  }, [token, batch, month, status])

  const reviewed = (update) =>
    setUpdates((list) =>
      status && update.status !== status
        ? list.filter((u) => u._id !== update._id)
        : list.map((u) => (u._id === update._id ? { ...u, ...update, student: u.student } : u)),
    )

  return (
    <>
      <PageHeader
        kicker="Manage"
        title="OJT"
        subtitle="Schedule viva and meetings, and review monthly updates. To post an OJT announcement, tick “OJT announcement” on the Notices page."
        stats={[
          {
            label: 'Coming up',
            value: events ? events.length : '...',
            note: batch ? batchLabel(batch) : 'no batch yet',
          },
          {
            label: 'Updates shown',
            value: updates ? updates.length : '...',
            note: `${status ? UPDATE_STATUS[status].label.toLowerCase() : 'all'} · ${monthLabel(month)}`,
            tone: status === 'submitted' && updates?.length ? 'amber' : undefined,
          },
        ]}
        actions={
          batches.length > 0 && (
            <label className="field field--inline">
              <span className="sr-only">Batch</span>
              <select value={batch?._id ?? ''} onChange={(e) => setBatchId(e.target.value)}>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {batchLabel(b)}
                  </option>
                ))}
              </select>
            </label>
          )
        }
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      {batches.length === 0 && (
        <Panel title="Add a batch first" description="OJT dates and updates belong to a batch." />
      )}

      {batch && (
        <div className="columns">
          <div className="column column--wide">
            <Panel
              title="Monthly updates"
              action={
                <span className="filter-row filter-row--tight">
                  <label className="field field--inline">
                    <span className="sr-only">Month</span>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} />
                  </label>
                  <label className="field field--inline">
                    <span className="sr-only">Status</span>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="submitted">Waiting for review</option>
                      <option value="needs_changes">Needs changes</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="">All</option>
                    </select>
                  </label>
                </span>
              }
            >
              {updates && updates.length === 0 && <p className="empty-note">No updates here.</p>}
              {updates?.map((u) => (
                <ReviewCard key={u._id} update={u} token={token} onReviewed={reviewed} />
              ))}
            </Panel>
          </div>

          <div className="column">
            <Panel title={`Add a date for ${batchLabel(batch)}`}>
              <EventForm
                key={batch._id}
                token={token}
                batch={batch}
                onAdded={(e) =>
                  setEvents((list) => [...(list ?? []), e].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)))
                }
              />
            </Panel>
            <Panel title="Coming up">
              {events && events.length === 0 && <p className="empty-note">Nothing scheduled.</p>}
              {events?.map((e) => (
                <EventRow
                  key={e._id}
                  event={e}
                  actions={
                    canEdit(e, user) && (
                      <DeleteEvent
                        id={e._id}
                        token={token}
                        onDeleted={() => setEvents((list) => list.filter((x) => x._id !== e._id))}
                      />
                    )
                  }
                />
              ))}
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}

function DeleteEvent({ id, token, onDeleted }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button type="button" className="btn btn--outline btn--quiet" onClick={() => setConfirming(true)}>
        Delete
      </button>
    )
  }
  return (
    <button
      type="button"
      className="btn btn--danger"
      onClick={() =>
        api(`/ojt/events/${id}`, { method: 'DELETE', token })
          .then(onDeleted)
          .catch(() => setConfirming(false))
      }
    >
      Yes, delete
    </button>
  )
}

function ReviewCard({ update, token, onReviewed }) {
  const [feedback, setFeedback] = useState(update.feedback ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function decide(nextStatus) {
    setError('')
    setBusy(true)
    try {
      onReviewed(
        await api(`/ojt/updates/${update._id}/review`, {
          method: 'PATCH',
          token,
          body: { status: nextStatus, feedback: feedback.trim() || undefined },
        }),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const s = UPDATE_STATUS[update.status]
  return (
    <article className="review-card">
      <div className="review-card__head">
        <div>
          <div className="activity__title">
            {update.student?.user?.name} <span className="review-card__roll">{update.student?.rollNumber}</span>
          </div>
          <div className="activity__meta">
            {update.project} · {monthLabel(update.month)}
          </div>
        </div>
        <span className={`status status--${s.chip}`}>{s.label}</span>
      </div>
      <p className="update-summary__text">{update.workDone}</p>
      {update.nextPlan && (
        <p className="update-summary__text">
          <strong>Next:</strong> {update.nextPlan}
        </p>
      )}
      {update.blockers && (
        <p className="update-summary__text feedback--change-text">
          <strong>Blocked by:</strong> {update.blockers}
        </p>
      )}
      {update.links?.length > 0 && (
        <p className="update-summary__links">
          {update.links.map((l) => (
            <a key={l} href={l} target="_blank" rel="noreferrer">
              {l.replace(/^https?:\/\//, '')}
            </a>
          ))}
        </p>
      )}
      <div className="review-card__actions">
        <input
          className="review-card__feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback (needed for “Needs changes”)"
          maxLength={1000}
        />
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => decide('needs_changes')}
          disabled={busy || !feedback.trim()}
        >
          Needs changes
        </button>
        <button type="button" className="btn btn--primary" onClick={() => decide('reviewed')} disabled={busy}>
          Reviewed
        </button>
      </div>
      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}

function EventForm({ token, batch, onAdded }) {
  const empty = { type: 'viva', title: '', startsAt: '', place: '', link: '', details: '' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))
  const ready = form.title.trim() && form.startsAt

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      onAdded(
        await api('/ojt/events', {
          method: 'POST',
          token,
          body: {
            batch: batch._id,
            type: form.type,
            title: form.title.trim(),
            startsAt: new Date(form.startsAt).toISOString(),
            place: form.place.trim(),
            link: form.link.trim(),
            details: form.details.trim(),
          },
        }),
      )
      setForm({ ...empty, type: form.type })
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
      <div className="form-row form-row--even">
        <label className="field">
          Type
          <select value={form.type} onChange={set('type')}>
            <option value="viva">Viva</option>
            <option value="meeting">Meeting</option>
            <option value="deadline">Deadline</option>
          </select>
        </label>
        <label className="field">
          Date and time
          <input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} required />
        </label>
      </div>
      <label className="field">
        Title
        <input value={form.title} onChange={set('title')} placeholder="OJT viva round 1" maxLength={150} required />
      </label>
      <label className="field">
        Place (optional)
        <input value={form.place} onChange={set('place')} placeholder="Room 204" maxLength={120} />
      </label>
      <label className="field">
        Meeting link (optional)
        <input type="url" value={form.link} onChange={set('link')} placeholder="https://meet.google.com/..." />
      </label>
      <label className="field">
        Details (optional)
        <textarea value={form.details} onChange={set('details')} rows={3} maxLength={1000} />
      </label>
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !ready}>
          {saving ? 'Adding...' : 'Add date'}
        </button>
      </div>
    </form>
  )
}
