import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { CATEGORY_LABELS, STAGE_LABELS, shortDate } from '../../utils/activities.js'

export default function ImpactReviewPage() {
  const { token } = useAuth()
  const [pending, setPending] = useState(null)
  const [done, setDone] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/activities?status=pending', { token })
      .then(setPending)
      .catch((err) => setError(err.message))
  }, [token])

  function reviewed(id) {
    setPending((list) => list.filter((a) => a._id !== id))
    setDone((n) => n + 1)
  }

  return (
    <>
      <PageHeader
        kicker="Impact score"
        title="Activities to review"
        subtitle="Open the proof, then approve or reject. Points only count after approval."
        stats={[
          { label: 'Waiting', value: pending ? pending.length : '...', note: 'oldest first', tone: pending?.length ? 'amber' : undefined },
          { label: 'Reviewed now', value: done, note: 'since you opened this page' },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <Panel title="Waiting for review">
        {pending && pending.length === 0 && <p className="empty-note">All caught up. Nothing to review.</p>}
        {pending?.map((activity) => (
          <ReviewRow key={activity._id} activity={activity} token={token} onDone={() => reviewed(activity._id)} />
        ))}
      </Panel>
    </>
  )
}

function ReviewRow({ activity, token, onDone }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const student = activity.student
  const isUpgrade = activity.approvedPoints > 0

  async function decide(decision) {
    setError('')
    setBusy(true)
    try {
      await api(`/activities/${activity._id}/review`, {
        method: 'PATCH',
        token,
        body: { decision, note: note.trim() || undefined },
      })
      onDone()
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
          {student?.user?.name} ({student?.rollNumber}) · {CATEGORY_LABELS[activity.category]} ·{' '}
          {STAGE_LABELS[activity.stage]}
          {activity.date && ` · ${shortDate(activity.date)}`}
        </div>
        {isUpgrade && <p className="activity__hint">Was registered (5 points approved). Now says selected.</p>}
      </div>

      <div className="activity__side">
        <a className="btn btn--outline" href={activity.proofUrl} target="_blank" rel="noreferrer">
          Open proof
        </a>
        <span className="activity__points">+{activity.points - activity.approvedPoints} pts</span>
      </div>

      <div className="activity__actions">
        {!rejecting && (
          <>
            <button type="button" className="btn btn--outline btn--quiet" onClick={() => setRejecting(true)} disabled={busy}>
              Reject
            </button>
            <button type="button" className="btn btn--primary" onClick={() => decide('approved')} disabled={busy}>
              Approve
            </button>
          </>
        )}
      </div>

      {rejecting && (
        <form
          className="activity__edit"
          onSubmit={(event) => {
            event.preventDefault()
            decide('rejected')
          }}
        >
          <label className="field">
            Reason (the student will see this)
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Link does not show your name" maxLength={300} required />
          </label>
          <div className="activity__edit-actions">
            <button type="button" className="btn btn--outline" onClick={() => setRejecting(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy || !note.trim()}>
              Reject
            </button>
          </div>
        </form>
      )}

      {error && <p className="login__error activity__error" role="alert">{error}</p>}
    </div>
  )
}
