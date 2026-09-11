import { useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader.jsx'
import Panel from '../components/ui/Panel.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import ThemePicker from '../components/ui/ThemePicker.jsx'
import ChangePasswordDialog from '../components/auth/ChangePasswordDialog.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'

const ROLE_NAMES = {
  admin: 'Admin',
  hod: 'Head of department',
  batch_manager: 'Batch manager',
  teacher: 'Teacher',
  student: 'Student',
}

// The details shown for each kind of account
function detailsFor(user, profile) {
  const rows = [
    ['Email', user.email],
    ['Phone', user.phone || 'Not added'],
  ]
  if (user.role === 'student' && profile) {
    rows.unshift(['Roll number', profile.rollNumber])
    rows.push(
      ['Department', profile.department?.name],
      ['Batch', profile.batch?.name],
      ['Semester', profile.batch?.currentSemester],
    )
  }
  if ((user.role === 'teacher' || user.role === 'hod') && profile) {
    rows.unshift(['Employee ID', profile.employeeId])
    rows.push(['Department', profile.department?.name])
  }
  if (user.role === 'batch_manager' && profile?.batches) {
    rows.push([
      'Batches',
      profile.batches.map((b) => `${b.department?.code ?? ''} ${b.name}`.trim()).join(', ') || 'None yet',
    ])
  }
  return rows
}

export default function ProfilePage() {
  const { token, logout } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    api('/auth/me', { token })
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token])

  if (error) {
    return (
      <p className="login__error" role="alert">
        {error}
      </p>
    )
  }
  if (!data) return <div className="auth-loading">Loading your profile...</div>

  const { user, profile } = data
  return (
    <>
      <PageHeader
        kicker="Profile"
        title={user.name}
        subtitle={ROLE_NAMES[user.role]}
        actions={<Avatar name={user.name} />}
      />

      <div className="columns">
        <div className="column column--wide">
          <Panel
            title="Your details"
            description="Only the college admin can change these. Ask them if something is wrong."
          >
            <dl className="details">
              {detailsFor(user, profile).map(([label, value]) => (
                <div className="details__row" key={label}>
                  <dt>{label}</dt>
                  <dd>{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <div className="column">
          <Panel title="Theme">
            <ThemePicker />
          </Panel>

          <Panel title="Account">
            <div className="account-actions">
              <button type="button" className="btn btn--outline" onClick={() => setChanging(true)}>
                Change password
              </button>
              <button type="button" className="btn btn--outline btn--quiet" onClick={logout}>
                Log out
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {changing && <ChangePasswordDialog onClose={() => setChanging(false)} />}
    </>
  )
}
