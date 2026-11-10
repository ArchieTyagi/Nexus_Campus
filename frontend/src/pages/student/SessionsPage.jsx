import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import SessionCard from '../../components/opportunities/SessionCard.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { isLive } from '../../utils/opportunities.js'

export default function SessionsPage() {
  const { token } = useAuth()
  const [upcoming, setUpcoming] = useState(null)
  const [past, setPast] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/sessions?when=upcoming', { token }), api('/sessions?when=past', { token })])
      .then(([up, old]) => {
        setUpcoming(up)
        setPast(old)
      })
      .catch((err) => setError(err.message))
  }, [token])

  const live = upcoming?.filter(isLive) ?? []
  const next = upcoming?.[0]

  return (
    <>
      <PageHeader
        kicker="Sessions"
        title="Sessions and workshops"
        subtitle="Open source sessions, workshops and talks for you. Tap Join when it starts."
        stats={[
          {
            label: 'Live now',
            value: upcoming ? live.length : '...',
            note: live[0]?.title ?? 'nothing running',
            tone: live.length ? 'amber' : undefined,
          },
          { label: 'Coming up', value: upcoming ? upcoming.length - live.length : '...', note: 'scheduled' },
          {
            label: 'Next',
            value: next
              ? new Date(next.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : 'None',
            note: next?.title ?? 'nothing planned',
          },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <Panel title="Upcoming">
        {upcoming && upcoming.length === 0 && <p className="empty-note">No sessions planned right now.</p>}
        {upcoming?.map((s) => (
          <SessionCard key={s._id} session={s} />
        ))}
      </Panel>

      {past.length > 0 && (
        <Panel title="Past sessions">
          {past.slice(0, 20).map((s) => (
            <SessionCard key={s._id} session={s} />
          ))}
        </Panel>
      )}
    </>
  )
}
