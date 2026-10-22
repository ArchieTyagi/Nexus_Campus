import { useState } from 'react'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

// Current password, new password twice. Used on the first-login screen and in the sidebar dialog.
export default function ChangePasswordForm({ onDone, submitLabel = 'Save new password' }) {
  const { token, updateSession } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const tooShort = next.length > 0 && next.length < 8
  const tooLong = new TextEncoder().encode(next).length > 72
  const same = next.length > 0 && next === current
  const mismatch = again.length > 0 && again !== next
  const ready = current && next.length >= 8 && !tooLong && !same && next === again

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data = await api('/auth/change-password', {
        method: 'POST',
        token,
        body: { currentPassword: current, newPassword: next },
      })
      updateSession(data)
      onDone?.()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const type = show ? 'text' : 'password'

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}
      <label className="field">
        Current password
        <input
          type={type}
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </label>
      <label className="field">
        New password
        <input
          type={type}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </label>
      <label className="field">
        Type the new password again
        <input
          type={type}
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          required
        />
      </label>

      <ul className="pw-rules" aria-live="polite">
        <li className={next.length >= 8 && !tooLong ? 'is-ok' : tooShort || tooLong ? 'is-bad' : ''}>
          8 to 72 characters
        </li>
        <li className={next && !same ? 'is-ok' : same ? 'is-bad' : ''}>Different from the current one</li>
        <li className={again && !mismatch ? 'is-ok' : mismatch ? 'is-bad' : ''}>Both new passwords match</li>
      </ul>

      <label className="check">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        Show passwords
      </label>

      <button type="submit" className="btn btn--primary login__submit" disabled={saving || !ready}>
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
