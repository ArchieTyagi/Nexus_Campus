import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import InternshipCard from '../../components/opportunities/InternshipCard.jsx'
import AudienceFields from '../../components/forms/AudienceFields.jsx'
import DeleteButton from '../../components/ui/DeleteButton.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { audienceBody, audienceReady } from '../../utils/audience.js'
import { MODES } from '../../utils/opportunities.js'

export default function InternshipsAdminPage() {
  const { token } = useAuth()
  const [list, setList] = useState(null)
  const [departments, setDepartments] = useState([])
  const [batches, setBatches] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/internships', { token }), api('/departments', { token }), api('/batches', { token })])
      .then(([all, depts, allBatches]) => {
        setList(all)
        setDepartments(depts)
        setBatches(allBatches)
      })
      .catch((err) => setError(err.message))
  }, [token])

  const open = (list ?? []).filter((i) => i.isOpen)
  const closed = (list ?? []).filter((i) => !i.isOpen).reverse()
  const remove = (id) => setList((all) => all.filter((i) => i._id !== id))

  const card = (i) => (
    <InternshipCard
      key={i._id}
      internship={i}
      actions={
        <>
          <a className="btn btn--outline" href={i.applyLink} target="_blank" rel="noreferrer">
            Open form
          </a>
          <DeleteButton path={`/internships/${i._id}`} token={token} onDeleted={() => remove(i._id)} />
        </>
      }
      footer={<Applicants internship={i} token={token} />}
    />
  )

  return (
    <>
      <PageHeader
        kicker="Communicate"
        title="Internships"
        subtitle="Share openings instead of WhatsApp forwards. Students tap “I applied” so you can see who applied."
        stats={[
          { label: 'Open', value: list ? open.length : '...', note: 'accepting applications' },
          {
            label: 'Said they applied',
            value: list ? open.reduce((n, i) => n + i.appliedCount, 0) : '...',
            note: 'across open ones',
            tone: 'amber',
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
          <Panel title="Open">
            {list && open.length === 0 && <p className="empty-note">No open internships.</p>}
            <div className="internship-list">{open.map(card)}</div>
          </Panel>
          {closed.length > 0 && (
            <Panel title="Closed">
              <div className="internship-list">{closed.slice(0, 20).map(card)}</div>
            </Panel>
          )}
        </div>
        <div className="column">
          <Panel title="Post an internship">
            <InternshipForm
              token={token}
              departments={departments}
              batches={batches}
              onAdded={(i) => setList((all) => [...all, i].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)))}
            />
          </Panel>
        </div>
      </div>
    </>
  )
}

function Applicants({ internship, token }) {
  const [people, setPeople] = useState(null)
  const [open, setOpen] = useState(false)

  function toggle() {
    if (!open && !people) {
      api(`/internships/${internship._id}/applicants`, { token })
        .then(setPeople)
        .catch(() => setPeople([]))
    }
    setOpen((o) => !o)
  }

  if (!internship.appliedCount) return <p className="internship__applied">No one has marked “I applied” yet.</p>
  return (
    <div className="internship__applied">
      <button type="button" className="link-button" onClick={toggle} aria-expanded={open}>
        {internship.appliedCount} {internship.appliedCount === 1 ? 'student' : 'students'} applied {open ? '▲' : '▼'}
      </button>
      {open && (
        <ul className="applicant-list">
          {(people ?? []).map((p) => (
            <li key={p._id}>
              <strong>{p.name}</strong> {p.rollNumber} · {p.batch}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function InternshipForm({ token, departments, batches, onAdded }) {
  const empty = {
    role: '',
    company: '',
    mode: 'remote',
    location: '',
    stipend: '',
    duration: '',
    eligibility: '',
    details: '',
    applyLink: '',
    deadline: '',
    audience: 'all',
    department: '',
    batch: '',
  }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))
  const ready = form.role.trim() && form.company.trim() && form.applyLink.trim() && form.deadline && audienceReady(form)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const trimmed = Object.fromEntries(
        ['role', 'company', 'location', 'stipend', 'duration', 'eligibility', 'details', 'applyLink'].map((k) => [
          k,
          form[k].trim(),
        ]),
      )
      onAdded(
        await api('/internships', {
          method: 'POST',
          token,
          body: { ...trimmed, mode: form.mode, deadline: form.deadline, ...audienceBody(form) },
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
        Role
        <input
          value={form.role}
          onChange={set('role')}
          placeholder="Frontend developer intern"
          maxLength={120}
          required
        />
      </label>
      <label className="field">
        Company
        <input value={form.company} onChange={set('company')} maxLength={120} required />
      </label>
      <div className="form-row form-row--even">
        <label className="field">
          Mode
          <select value={form.mode} onChange={set('mode')}>
            {Object.entries(MODES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Last date to apply
          <input type="date" value={form.deadline} onChange={set('deadline')} required />
        </label>
      </div>
      <div className="form-row form-row--even">
        <label className="field">
          Stipend (optional)
          <input value={form.stipend} onChange={set('stipend')} placeholder="15,000 / month" maxLength={60} />
        </label>
        <label className="field">
          Duration (optional)
          <input value={form.duration} onChange={set('duration')} placeholder="3 months" maxLength={60} />
        </label>
      </div>
      <label className="field">
        Location (optional)
        <input value={form.location} onChange={set('location')} placeholder="Bengaluru" maxLength={120} />
      </label>
      <label className="field">
        Who can apply (optional)
        <input
          value={form.eligibility}
          onChange={set('eligibility')}
          placeholder="2nd and 3rd year, knows React"
          maxLength={300}
        />
      </label>
      <label className="field">
        Apply link
        <input
          type="url"
          value={form.applyLink}
          onChange={set('applyLink')}
          placeholder="https://forms.gle/..."
          required
        />
      </label>
      <label className="field">
        Details (optional)
        <textarea value={form.details} onChange={set('details')} rows={4} maxLength={3000} />
      </label>
      <AudienceFields form={form} set={set} departments={departments} batches={batches} />
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving || !ready}>
          {saving ? 'Posting...' : 'Post internship'}
        </button>
      </div>
    </form>
  )
}
