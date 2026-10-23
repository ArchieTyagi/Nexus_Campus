import Logo from '../components/ui/Logo.jsx'
import ChangePasswordForm from '../components/auth/ChangePasswordForm.jsx'
import { useAuth } from '../context/useAuth.js'

// Shown instead of any page while the user still has a temporary password
export default function ChangePasswordPage() {
  const { user, logout } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <div className="login">
      <section className="login__intro">
        <div className="login__brand">
          <Logo size={38} />
          <span>Nexus Campus</span>
        </div>
        <div>
          <h1 className="login__headline">
            Welcome{firstName && `, ${firstName}`}. <em>Make it yours.</em>
          </h1>
          <p className="login__sub">
            You logged in with a temporary password. Set your own before you continue, so only you can get into your
            account.
          </p>
        </div>
        <span />
      </section>

      <section className="login__card">
        <div className="login__form">
          <div>
            <h2 className="login__title">Set your password</h2>
            <p className="login__hint">Use the temporary password you were given as the current password.</p>
          </div>
          <ChangePasswordForm submitLabel="Save and continue" />
          <button type="button" className="link-button pw-logout" onClick={logout}>
            Log out instead
          </button>
        </div>
      </section>
    </div>
  )
}
