import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import EventRow from '../../components/ojt/EventRow.jsx'
import NoticeCard from '../../components/notices/NoticeCard.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { UPDATE_STATUS, eventTime, monthLabel } from '../../utils/ojt.js'

export default function OjtPage() {
  const { token } = useAuth()
  const [mine, setMine] = useState(null)
  const [events, setEvents] = useState([])
  const [notices, setNotices] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api('/ojt/updates/mine', { token }),
      api('/ojt/events?upcoming=true', { token }),
      api('/notices?category=ojt', { token }),
    ])
      .then(([updates, upcoming, ojtNotices]) => {
        setMine(updates)
        setEvents(upcoming)
        setNotices(ojtNotices)
      })
      .catch((err) => setError(err.message))
  }, [token])

  const current = mine?.updates.find((u) => u.month === mine.thisMonth)
  const past = mine?.updates.filter((u) => u.month !== mine.thisMonth) ?? []
  const lastProject = mine?.updates[0]?.project ?? ''
  const nextViva = events.find((e) => e.type === 'viva')
  const nextMeeting = events.find((e) => e.type === 'meeting')

  const saved = (update) =>
    setMine((m) => ({ ...m, updates: [update, ...m.updates.filter((u) => u._id !== update._id)] }))

  const status = current ? UPDATE_STATUS[current.status] : null

  return (
    <>
      <PageHeader
        kicker="OJT"
        title="On the job training"
        subtitle="Your monthly update, viva dates, meetings and OJT announcements in one place."
        stats={[
          {
            label: mine ? `${monthLabel(mine.thisMonth)} update` : 'This month',
            value: mine ? (status ? status.label : 'Not sent') : '...',
            note: current
              ? `last saved ${new Date(current.updatedAt).toLocaleDateString('en-IN')}`
              : 'send it before the deadline',
            tone: !current || current.status === 'needs_changes' ? 'red' : 'amber',
          },
          {
            label: 'Next viva',
            value: nextViva
              ? new Date(nextViva.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : 'None',
            note: nextViva ? eventTime(nextViva.startsAt) : 'not scheduled yet',
          },
          {
            label: 'Next meeting',
            value: nextMeeting
              ? new Date(nextMeeting.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : 'None',
            note: nextMeeting ? nextMeeting.title : 'nothing planned',
          },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <div className="columns">
        <div className="column column--wide">
          {mine && (
            <Panel title={`Update for ${monthLabel(mine.thisMonth)}`}>
              {current?.status === 'needs_changes' && (
                <p className="feedback feedback--change">
                  <strong>Needs changes:</strong> {current.feedback}
                </p>
              )}
              {current?.status === 'reviewed' ? (
                <UpdateSummary update={current} />
              ) : (
                <UpdateForm
                  key={current?._id ?? 'new'}
                  token={token}
                  current={current}
                  lastProject={lastProject}
                  onSaved={saved}
                />
              )}
            </Panel>
          )}

          {past.length > 0 && (
            <Panel title="Earlier months">
              {past.map((u) => (
                <details key={u._id} className="past-update">
                  <summary>
                    <span>{monthLabel(u.month)}</span>
                    <span className={`status status--${UPDATE_STATUS[u.status].chip}`}>
                      {UPDATE_STATUS[u.status].label}
                    </span>
                  </summary>
                  <UpdateSummary update={u} />
                </details>
              ))}
            </Panel>
          )}
        </div>

        <div className="column">
          <Panel title="Coming up">
            {events.length === 0 && <p className="empty-note">No viva, meeting or deadline scheduled.</p>}
            {events.map((e) => (
              <EventRow key={e._id} event={e} />
            ))}
          </Panel>

          <Panel title="OJT announcements">
            {notices.length === 0 && <p className="empty-note">No OJT announcements yet.</p>}
            <div className="notice-list notice-list--compact">
              {notices.map((n) => (
                <NoticeCard key={n._id} notice={n} isNew={n.isNew} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

function UpdateSummary({ update }) {
  return (
    <div className="update-summary">
      <p>
        <strong>Project:</strong> {update.project}
      </p>
      <p className="update-summary__text">
        <strong>What I did:</strong> {update.workDone}
      </p>
      {update.nextPlan && (
        <p className="update-summary__text">
          <strong>Next month:</strong> {update.nextPlan}
        </p>
      )}
      {update.blockers && (
        <p className="update-summary__text">
          <strong>Blockers:</strong> {update.blockers}
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
      {update.feedback && update.status === 'reviewed' && (
        <p className="feedback">
          <strong>Feedback:</strong> {update.feedback}
        </p>
      )}
    </div>
  )
}

function UpdateForm({ token, current, lastProject, onSaved }) {
  const [form, setForm] = useState({
    project: current?.project ?? lastProject,
    workDone: current?.workDone ?? '',
    nextPlan: current?.nextPlan ?? '',
    blockers: current?.blockers ?? '',
    links: current?.links?.join('\n') ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedNow, setSavedNow] = useState(false)

  const set = (key) => (event) => {
    setSavedNow(false)
    setForm((f) => ({ ...f, [key]: event.target.value }))
  }
  const ready = form.project.trim() && form.workDone.trim()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const update = await api('/ojt/updates/mine', {
        method: 'PUT',
        token,
        body: {
          project: form.project.trim(),
          workDone: form.workDone.trim(),
          nextPlan: form.nextPlan.trim(),
          blockers: form.blockers.trim(),
          links: form.links
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean),
        },
      })
      onSaved(update)
      setSavedNow(true)
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
        Project name
        <input value={form.project} onChange={set('project')} placeholder="Nexus Campus" maxLength={120} required />
      </label>
      <label className="field">
        What did you do this month?
        <textarea value={form.workDone} onChange={set('workDone')} rows={5} maxLength={3000} required />
      </label>
      <div className="form-row form-row--even">
        <label className="field">
          Plan for next month (optional)
          <textarea value={form.nextPlan} onChange={set('nextPlan')} rows={3} maxLength={1500} />
        </label>
        <label className="field">
          Anything blocking you? (optional)
          <textarea value={form.blockers} onChange={set('blockers')} rows={3} maxLength={1000} />
        </label>
      </div>
      <label className="field">
        Links, one per line (GitHub, demo, docs)
        <textarea value={form.links} onChange={set('links')} rows={3} placeholder="https://github.com/..." />
      </label>
      <div className="form__actions form__actions--split">
        {savedNow && <span className="saved-note">Saved. You can edit it until it is reviewed.</span>}
        <button type="submit" className="btn btn--primary" disabled={saving || !ready}>
          {saving ? 'Saving...' : current ? 'Save changes' : 'Send update'}
        </button>
      </div>
    </form>
  )
}
