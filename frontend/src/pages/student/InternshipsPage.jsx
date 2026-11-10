import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import InternshipCard from '../../components/opportunities/InternshipCard.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { MODES, daysLeft } from '../../utils/opportunities.js'

export default function InternshipsPage() {
  const { token } = useAuth()
  const [list, setList] = useState(null)
  const [mode, setMode] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/internships', { token })
      .then(setList)
      .catch((err) => setError(err.message))
  }, [token])

  async function toggleApplied(item) {
    try {
      const res = await api(`/internships/${item._id}/applied`, {
        method: 'POST',
        token,
        body: { applied: !item.youApplied },
      })
      setList((all) => all.map((i) => (i._id === item._id ? { ...i, youApplied: res.youApplied } : i)))
    } catch (err) {
      setError(err.message)
    }
  }

  const open = (list ?? []).filter((i) => i.isOpen && (mode === 'all' || i.mode === mode))
  const closed = (list ?? []).filter((i) => !i.isOpen).reverse()
  const soon = (list ?? []).filter((i) => i.isOpen && daysLeft(i.deadline) <= 7 && !i.youApplied)

  return (
    <>
      <PageHeader
        kicker="Internships"
        title="Internships"
        subtitle="Openings shared by the college. Apply through the link, then tap “I applied” so you and your batch manager can keep track."
        stats={[
          { label: 'Open', value: list ? list.filter((i) => i.isOpen).length : '...', note: 'you can still apply' },
          {
            label: 'Closing this week',
            value: list ? soon.length : '...',
            note: 'not applied yet',
            tone: soon.length ? 'red' : undefined,
          },
          {
            label: 'You applied',
            value: list ? list.filter((i) => i.youApplied).length : '...',
            note: 'so far',
            tone: 'amber',
          },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <Panel>
        <div className="chips" role="group" aria-label="Work mode">
          {[['all', 'All'], ...Object.entries(MODES)].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip ${mode === value ? 'is-active' : ''}`}
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
            >
              {label}
            </button>
          ))}
        </div>
        {list && open.length === 0 && <p className="empty-note">No open internships here right now.</p>}
        <div className="internship-list">
          {open.map((i) => (
            <InternshipCard
              key={i._id}
              internship={i}
              actions={
                <>
                  <a className="btn btn--primary" href={i.applyLink} target="_blank" rel="noreferrer">
                    Apply
                  </a>
                  <button
                    type="button"
                    className={`btn btn--outline ${i.youApplied ? 'is-done' : ''}`}
                    onClick={() => toggleApplied(i)}
                    aria-pressed={i.youApplied}
                  >
                    {i.youApplied ? '✓ Applied' : 'I applied'}
                  </button>
                </>
              }
            />
          ))}
        </div>
      </Panel>

      {closed.length > 0 && (
        <Panel title="Closed">
          <div className="internship-list">
            {closed.slice(0, 20).map((i) => (
              <InternshipCard
                key={i._id}
                internship={i}
                actions={i.youApplied ? <span className="status status--approved">You applied</span> : null}
              />
            ))}
          </div>
        </Panel>
      )}
    </>
  )
}
