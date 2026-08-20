import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import Logo from '../ui/Logo.jsx'
import ChangePasswordDialog from '../auth/ChangePasswordDialog.jsx'
import { navigation } from '../../config/navigation.js'

// The menu's code is only downloaded the first time someone opens it
const Sidebar = lazy(() => import('./Sidebar.jsx'))

export default function DashboardLayout({ role }) {
  const [open, setOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const menuButton = useRef(null)

  const close = useCallback(() => {
    setOpen(false)
    menuButton.current?.focus()
  }, [])

  // While the menu is open: Esc closes it, and the page behind does not scroll
  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close])

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          ref={menuButton}
          type="button"
          className="topbar__menu"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" size={22} />
        </button>
        <Link to={`/${role}`} className="topbar__brand">
          <Logo size={28} />
          <span>Nexus Campus</span>
        </Link>
        <span className="topbar__role">{navigation[role].label}</span>
      </header>

      {open && (
        <div className="drawer">
          <div className="drawer__backdrop" onClick={close} aria-hidden="true" />
          <Suspense fallback={<div className="drawer__loading">Loading menu...</div>}>
            <Sidebar
              role={role}
              onClose={close}
              onChangePassword={() => {
                setOpen(false)
                setChangingPassword(true)
              }}
            />
          </Suspense>
        </div>
      )}

      <main className="main">
        <Outlet />
      </main>

      {changingPassword && <ChangePasswordDialog onClose={() => setChangingPassword(false)} />}
    </div>
  )
}
