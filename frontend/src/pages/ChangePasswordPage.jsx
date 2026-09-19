import Logo from '../components/ui/Logo.jsx'
import ChangePasswordForm from '../components/auth/ChangePasswordForm.jsx'
import { useAuth } from '../context/useAuth.js'

// Shown instead of any page while the user still has a temporary password
export default function ChangePasswordPage() {
  const { user, logout } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <div className="login">
      <main className="login__wrap">
        <div className="login__brand">
          <Logo size={32} />
          <span>Nexus Campus</span>
        </div>

        <section className="login__card">
          <div className="login__form">
            <div>
              <h1 className="login__title">Welcome{firstName && `, ${firstName}`}. Set your own password</h1>
              <p className="login__hint">
                You logged in with a temporary password. Enter it as the current password, then choose one only you
                know.
              </p>
            </div>
            <ChangePasswordForm submitLabel="Save and continue" />
          </div>
          <p className="login__foot">
            Not you?{' '}
            <button type="button" className="link-button" onClick={logout}>
              Log out
            </button>
          </p>
        </section>
      </main>
    </div>
  )
}
