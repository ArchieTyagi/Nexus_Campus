import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import WeekGrid from '../../components/timetable/WeekGrid.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const batchLabel = (b) => `${b.department?.code ?? ''} ${b.name}`.trim()
const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function TimetableAdminPage() {
  const { token } = useAuth()
  const [batches, setBatches] = useState([])
  const [batchId, setBatchId] = useState('')
  const [courses, setCourses] = useState([])
  const [slots, setSlots] = useState(null)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/batches', { token })
      .then(setBatches)
      .catch((err) => setError(err.message))
  }, [token])

  const batch = batches.find((b) => b._id === batchId) ?? batches[0]

  useEffect(() => {
    if (!batch) return
    Promise.all([api(`/timetable?batch=${batch._id}`, { token }), api(`/courses?batch=${batch._id}`, { token })])
      .then(([week, list]) => {
        setSlots(week)
        setCourses(list)
      })
      .catch((err) => setError(err.message))
  }, [token, batch])

  const sortWeek = (list) =>
    [...list].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime))
  const saved = (slot) => {
    setSlots((list) => sortWeek([...list.filter((s) => s._id !== slot._id), slot]))
    setEditing(null)
  }

  async function remove(slot) {
    try {
      await api(`/timetable/${slot._id}`, { method: 'DELETE', token })
      setSlots((list) => list.filter((s) => s._id !== slot._id))
      if (editing?._id === slot._id) setEditing(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const hours = (slots ?? []).reduce((sum, s) => sum + (toMinutes(s.endTime) - toMinutes(s.startTime)), 0) / 60

  return (
    <>
      <PageHeader
        kicker="Manage"
        title="Timetable"
        subtitle="The weekly classes for each batch. Students and teachers see this on their home screen and timetable page."
        stats={[
          {
            label: 'Classes a week',
            value: slots ? slots.length : '...',
            note: batch ? batchLabel(batch) : 'no batch yet',
          },
          { label: 'Hours a week', value: slots ? String(Math.round(hours * 10) / 10) : '...', note: 'of teaching' },
        ]}
        actions={
          batches.length > 0 && (
            <label className="field field--inline">
              <span className="sr-only">Batch</span>
              <select
                value={batch?._id ?? ''}
                onChange={(e) => {
                  setBatchId(e.target.value)
                  setEditing(null)
                }}
              >
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

      {batches.length === 0 && <Panel title="Add a batch first" description="Create one in Departments and batches." />}

      {batch && (
        <>
          <Panel
            title={
              editing
                ? `Change ${editing.course?.code} on ${editing.day} ${editing.startTime}`
                : `Add a class to ${batchLabel(batch)}`
            }
            description={
              courses.length === 0
                ? 'This batch has no courses yet. Add them in Courses first.'
                : 'The server stops clashes: the same batch, teacher or room cannot have two classes at the same time.'
            }
          >
            {courses.length > 0 && (
              <SlotForm
                key={editing?._id ?? `new-${batch._id}`}
                token={token}
                courses={courses}
                editing={editing}
                onSaved={saved}
                onCancel={() => setEditing(null)}
              />
            )}
          </Panel>

          <Panel title={`Week of ${batchLabel(batch)}`}>
            {slots && (
              <WeekGrid
                slots={slots}
                selectedId={editing?._id}
                renderActions={(s) => (
                  <>
                    <button type="button" className="link-button" onClick={() => setEditing(s)}>
                      Edit
                    </button>
                    <DeleteSlot onConfirm={() => remove(s)} />
                  </>
                )}
              />
            )}
          </Panel>
        </>
      )}
    </>
  )
}

function DeleteSlot({ onConfirm }) {
  const [sure, setSure] = useState(false)
  return sure ? (
    <button type="button" className="link-button link-button--danger" onClick={onConfirm}>
      Yes, delete
    </button>
  ) : (
    <button type="button" className="link-button link-button--quiet" onClick={() => setSure(true)}>
      Delete
    </button>
  )
}

function SlotForm({ token, courses, editing, onSaved, onCancel }) {
  const [form, setForm] = useState({
    course: editing?.course?._id ?? courses[0]?._id ?? '',
    day: editing?.day ?? 'Mon',
    startTime: editing?.startTime ?? '09:00',
    endTime: editing?.endTime ?? '10:00',
    room: editing?.room ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))
  const ready = form.course && form.startTime && form.endTime && form.startTime < form.endTime

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = { day: form.day, startTime: form.startTime, endTime: form.endTime, room: form.room.trim() }
      const slot = editing
        ? await api(`/timetable/${editing._id}`, { method: 'PATCH', token, body })
        : await api('/timetable', { method: 'POST', token, body: { ...body, course: form.course } })
      onSaved(slot)
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
      <div className="form-grid">
        <label className="field">
          Course
          <select value={form.course} onChange={set('course')} disabled={Boolean(editing)}>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Day
          <select value={form.day} onChange={set('day')}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Starts
          <input type="time" value={form.startTime} onChange={set('startTime')} required />
        </label>
        <label className="field">
          Ends
          <input type="time" value={form.endTime} onChange={set('endTime')} required />
        </label>
        <label className="field">
          Room
          <input value={form.room} onChange={set('room')} placeholder="Room 204" maxLength={40} />
        </label>
      </div>
      {form.startTime >= form.endTime && <p className="row-note">The class must end after it starts.</p>}
      <div className="form__actions form__actions--split">
        {editing && (
          <button type="button" className="btn btn--outline" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving || !ready}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Add class'}
        </button>
      </div>
    </form>
  )
}
