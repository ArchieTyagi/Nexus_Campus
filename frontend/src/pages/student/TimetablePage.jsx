import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import WeekGrid from '../../components/timetable/WeekGrid.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

// Weekly timetable. Students see their batch, teachers see their own classes (with the batch name).
export default function TimetablePage() {
  const { token, user } = useAuth()
  const [slots, setSlots] = useState(null)
  const [error, setError] = useState('')
  const isStudent = user?.role === 'student'

  useEffect(() => {
    api('/timetable', { token })
      .then(setSlots)
      .catch((err) => setError(err.message))
  }, [token])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' })
  const todayCount = slots?.filter((s) => s.day === today).length ?? 0

  return (
    <>
      <PageHeader
        kicker="Timetable"
        title={isStudent ? 'Your week' : 'Your teaching week'}
        subtitle={
          isStudent ? 'Classes for your batch, Monday to Saturday.' : 'Every class you teach, across all your batches.'
        }
        stats={[
          {
            label: 'Today',
            value: slots ? String(todayCount) : '...',
            note: todayCount === 1 ? 'class' : 'classes',
            tone: 'amber',
          },
          { label: 'This week', value: slots ? String(slots.length) : '...', note: 'classes' },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <Panel>
        {slots && slots.length === 0 && (
          <p className="empty-note">No timetable yet. It shows here once the admin adds it.</p>
        )}
        {slots && slots.length > 0 && <WeekGrid slots={slots} show={isStudent ? 'teacher' : 'batch'} />}
      </Panel>
    </>
  )
}
