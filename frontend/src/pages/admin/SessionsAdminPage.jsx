import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import SessionCard from '../../components/opportunities/SessionCard.jsx'
import AudienceFields from '../../components/forms/AudienceFields.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import DeleteButton from '../../components/ui/DeleteButton.jsx'
import { audienceBody, audienceReady } from '../../utils/audience.js'
import { SESSION_KINDS } from '../../utils/opportunities.js'

export default function SessionsAdminPage() {
  const { token } = useAuth()
  const [sessions, setSessions] = useState(null)
  const [departments, setDepartments] = useState([])
  const [batches, setBatches] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/sessions?when=upcoming', { token }), api('/departments', { token }), api('/batches', { token })])
      .then(([list, depts, allBatches]) => {
        setSessions(list)
        setDepartments(depts)
        setBatches(allBatches)
      })
      .catch((err) => setError(err.message))
  }, [token])

  return (
    <>
      <PageHeader
        kicker="Communicate"
        title="Sessions"
        subtitle="Post open source sessions, workshops and talks. Students see a Join button that turns amber when it is live."
        stats={[{ label: 'Upcoming', value: sessions ? sessions.length : '...', note: 'posted' }]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <div className="columns">
        <div className="column column--wide">
          <Panel title="Upcoming sessions">
            {sessions && sessions.length === 0 && <p className="empty-note">Nothing posted yet.</p>}
            {sessions?.map((s) => (
              <SessionCard
                key={s._id}
                session={s}
                actions={
                  <DeleteButton
                    path={`/sessions/${s._id}`}
                    token={token}
                    onDeleted={() => setSessions((list) => list.filter((x) => x._id !== s._id))}
                  />
                }
              />
            ))}
          </Panel>
        </div>
        <div className="column">
          <Panel title="Post a session">
            <SessionForm
              token={token}
              departments={departments}
              batches={batches}
              onAdded={(s) =>
                setSessions((list) => [...list, s].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)))
              }
            />
          </Panel>
        </div>
      </div>
    </>
  )
}

function SessionForm({ token, departments, batches, onAdded }) {
  const empty = {
    title: '',
    kind: 'open_source',
    speaker: '',
    startsAt: '',
    minutes: '60',
    place: '',
    link: '',
    details: '',
    audience: 'all',
    department: '',
    batch: '',
  }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))
  const ready = form.title.trim() && form.startsAt && audienceReady(form)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      onAdded(
        await api('/sessions', {
          method: 'POST',
          token,
          body: {
            title: form.title.trim(),
            kind: form.kind,
            speaker: form.speaker.trim(),
            startsAt: new Date(form.startsAt).toISOString(),
            minutes: Number(form.minutes),
            place: form.place.trim(),
            link: form.link.trim(),
            details: form.details.trim(),
            ...audienceBody(form),
          },
        }),
      )
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
        <input
          value={form.title}
          onChange={set('title')}
          placeholder="Getting started with GSoC"
          maxLength={150}
          required
        />
      </label>
      <div className="form-row form-row--even">
        <label className="field">
          Type
          <select value={form.kind} onChange={set('kind')}>
            {Object.entries(SESSION_KINDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Length
          <select value={form.minutes} onChange={set('minutes')}>
            {[30, 45, 60, 90, 120, 180].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? 's' : ''}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        Date and time
        <input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} required />
      </label>
      <label className="field">
        Speaker (optional)
        <input value={form.speaker} onChange={set('speaker')} placeholder="Name, company" maxLength={120} />
      </label>
      <label className="field">
        Meeting link (optional)
        <input type="url" value={form.link} onChange={set('link')} placeholder="https://meet.google.com/..." />
      </label>
      <label className="field">
        Place (optional)
        <input value={form.place} onChange={set('place')} placeholder="Seminar hall" maxLength={120} />
      </label>
      <label className="field">
        Details (optional)
        <textarea value={form.details} onChange={set('details')} rows={3} maxLength={2000} />
      </label>
      <AudienceFields form={form} set={set} departments={departments} batches={batches} />
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !ready}>
          {saving ? 'Posting...' : 'Post session'}
        </button>
      </div>
    </form>
  )
}
