import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { CATEGORY_LABELS, STAGE_LABELS, STATUS_LABELS, shortDate } from '../../utils/activities.js'

export default function ImpactScorePage() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [board, setBoard] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      const [mine, leaderboard] = await Promise.all([
        api('/activities/mine', { token }),
        api('/activities/leaderboard', { token }),
      ])
      setData(mine)
      setBoard(leaderboard)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    Promise.all([api('/activities/mine', { token }), api('/activities/leaderboard', { token })])
      .then(([mine, leaderboard]) => {
        setData(mine)
        setBoard(leaderboard)
      })
      .catch((err) => setError(err.message))
  }, [token])

  const me = board?.me

  return (
    <>
      <PageHeader
        kicker="Impact score"
        title="Your impact score"
        subtitle="Points for what you do outside class: hackathons, internships, open source and more."
        stats={[
          { label: 'Score', value: data ? data.score : '...', note: 'approved points', tone: 'amber' },
          { label: 'Waiting for review', value: data ? `+${data.waiting}` : '...', note: 'adds up once approved' },
          {
            label: 'Batch rank',
            value: me ? `#${me.rank}` : '...',
            note: me ? `out of ${me.outOf} students` : '',
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
          <Panel
            title="Add an activity"
            description="Add a proof link so it can be checked. Registered gives 5 points, selected or submitted gives 15 more."
          >
            <ActivityForm token={token} onAdded={load} />
          </Panel>

          <Panel title="Your activities">
            {data && data.activities.length === 0 && (
              <p className="empty-note">Nothing yet. Registered for a hackathon? Add it above.</p>
            )}
            {data?.activities.map((activity) => (
              <ActivityRow key={activity._id} activity={activity} token={token} onChanged={load} />
            ))}
          </Panel>
        </div>

        <div className="column">
          <Panel title="Batch leaderboard" description="Top 10 by approved points.">
            {board && board.top.length === 0 && <p className="empty-note">No approved points in your batch yet.</p>}
            <ol className="leaderboard">
              {board?.top.map((row) => (
                <li
                  key={row.student}
                  className={`leaderboard__row ${String(row.student) === String(me?.student) ? 'is-me' : ''}`}
                >
                  <span className="leaderboard__rank">#{row.rank}</span>
                  <span className="leaderboard__name">
                    {row.name}
                    <span className="leaderboard__roll">{row.rollNumber}</span>
                  </span>
                  <span className="leaderboard__points">{row.points}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="How points work">
            <ul className="points-rules">
              <li>
                <strong>+5</strong> when you register
              </li>
              <li>
                <strong>+15</strong> more when you are selected or submit
              </li>
              <li>Points count after the batch manager checks your proof</li>
              <li>Got selected later? Open the activity and add the new proof</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}

function ActivityForm({ token, onAdded }) {
  const empty = { title: '', category: 'hackathon', stage: 'registered', proofUrl: '', date: '' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = { ...form, title: form.title.trim(), proofUrl: form.proofUrl.trim() }
      if (!body.date) delete body.date
      await api('/activities', { method: 'POST', token, body })
      setForm(empty)
      await onAdded()
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
        What did you do?
        <input value={form.title} onChange={set('title')} placeholder="Smart India Hackathon 2026" maxLength={120} required />
      </label>
      <div className="form-row form-row--three">
        <label className="field">
          Type
          <select value={form.category} onChange={set('category')}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Stage
          <select value={form.stage} onChange={set('stage')}>
            <option value="registered">Registered (+5)</option>
            <option value="selected">Selected / submitted (+20 total)</option>
          </select>
        </label>
        <label className="field">
          Date (optional)
          <input type="date" value={form.date} onChange={set('date')} />
        </label>
      </div>
      <label className="field">
        Proof link
        <input
          type="url"
          value={form.proofUrl}
          onChange={set('proofUrl')}
          placeholder="https://... (certificate, LinkedIn post, email screenshot on Drive)"
          required
        />
      </label>
      <div className="form__actions">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={saving || !form.title.trim() || !form.proofUrl.trim()}
        >
          {saving ? 'Adding...' : 'Add activity'}
        </button>
      </div>
    </form>
  )
}

function ActivityRow({ activity, token, onChanged }) {
  // 'upgrade' = got selected, 'resend' = fix a rejected one
  const [mode, setMode] = useState(null)
  const [proofUrl, setProofUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canUpgrade = activity.status === 'approved' && activity.stage === 'registered'
  const canDelete = activity.status === 'pending' && activity.approvedPoints === 0

  async function send(body) {
    setError('')
    setBusy(true)
    try {
      await api(`/activities/${activity._id}`, { method: 'PATCH', token, body })
      setMode(null)
      setProofUrl('')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await api(`/activities/${activity._id}`, { method: 'DELETE', token })
      await onChanged()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="activity">
      <div className="activity__main">
        <div className="activity__title">{activity.title}</div>
        <div className="activity__meta">
          {CATEGORY_LABELS[activity.category]} · {STAGE_LABELS[activity.stage]}
          {activity.date && ` · ${shortDate(activity.date)}`} ·{' '}
          <a href={activity.proofUrl} target="_blank" rel="noreferrer">
            Proof
          </a>
        </div>
        {activity.status === 'rejected' && activity.reviewNote && (
          <p className="activity__note">Reason: {activity.reviewNote}</p>
        )}
      </div>

      <div className="activity__side">
        <span className={`status status--${activity.status}`}>{STATUS_LABELS[activity.status]}</span>
        <span className="activity__points">
          {activity.approvedPoints}
          {activity.status === 'pending' && activity.points > activity.approvedPoints && (
            <span className="activity__waiting"> +{activity.points - activity.approvedPoints}</span>
          )}{' '}
          pts
        </span>
      </div>

      <div className="activity__actions">
        {canUpgrade && !mode && (
          <button type="button" className="btn btn--outline" onClick={() => setMode('upgrade')}>
            I got selected
          </button>
        )}
        {activity.status === 'rejected' && !mode && (
          <button type="button" className="btn btn--outline" onClick={() => setMode('resend')}>
            Fix proof and resend
          </button>
        )}
        {canDelete && (
          <button type="button" className="btn btn--outline btn--quiet" onClick={remove} disabled={busy}>
            Delete
          </button>
        )}
      </div>

      {mode && (
        <form
          className="activity__edit"
          onSubmit={(event) => {
            event.preventDefault()
            send(mode === 'upgrade' ? { stage: 'selected', proofUrl: proofUrl.trim() } : { proofUrl: proofUrl.trim() })
          }}
        >
          <label className="field">
            {mode === 'upgrade' ? 'Proof of selection or submission' : 'New proof link'}
            <input type="url" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." required />
          </label>
          <div className="activity__edit-actions">
            <button type="button" className="btn btn--outline" onClick={() => setMode(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy || !proofUrl.trim()}>
              {busy ? 'Sending...' : 'Send for review'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="login__error activity__error" role="alert">{error}</p>}
    </div>
  )
}
