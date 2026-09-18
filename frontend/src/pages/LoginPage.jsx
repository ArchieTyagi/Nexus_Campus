import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/ui/Logo.jsx'
import { useAuth } from '../context/useAuth.js'
import { homeFor } from '../utils/roles.js'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <div className="auth-loading">Loading...</div>
  if (user) return <Navigate to={homeFor(user.role)} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const loggedIn = await login(loginId.trim(), password)
      navigate(location.state?.from || homeFor(loggedIn.role), { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <main className="login__wrap">
        <div className="login__brand">
          <Logo size={32} />
          <span>Nexus Campus</span>
        </div>

        <section className="login__card">
          <form className="form login__form" onSubmit={handleSubmit} noValidate>
            <div>
              <h1 className="login__title">Log in</h1>
              <p className="login__hint">Use your college email. Students can use their roll number instead.</p>
            </div>

            {error && (
              <p className="login__error" role="alert">
                {error}
              </p>
            )}

            <label className="field">
              Email or roll number
              <input
                type="text"
                name="login"
                autoComplete="username"
                placeholder="name@college.edu or PST-25-0001"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                required
                autoFocus
              />
            </label>

            <label className="field">
              Password
              <span className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>

            <button
              type="submit"
              className="btn btn--primary login__submit"
              disabled={submitting || !loginId.trim() || !password}
            >
              {submitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>
          <p className="login__foot">Forgot your password? Ask the college admin to reset it.</p>
        </section>

        <p className="login__about">Your timetable, attendance, notices, study material and OJT in one place.</p>
      </main>
    </div>
  )
}
