import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import ThemeToggle from '../ui/ThemeToggle.jsx'
import Logo from '../ui/Logo.jsx'
import { navigation } from '../../config/navigation.js'
import { useAuth } from '../../context/useAuth.js'

// The menu that slides in from the ☰ button. Picking a page closes it.
export default function Sidebar({ role, onClose, onChangePassword }) {
  const { label, groups } = navigation[role]
  const { logout } = useAuth()
  const closeButton = useRef(null)

  // Move keyboard focus into the menu when it opens
  useEffect(() => {
    closeButton.current?.focus()
  }, [])

  return (
    <nav id="main-menu" className="sidebar" aria-label="Main">
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <Logo />
          <div>
            <span className="sidebar__name">Nexus Campus</span>
            <span className="sidebar__role">{label}</span>
          </div>
        </div>
        <button ref={closeButton} type="button" className="sidebar__close" aria-label="Close menu" onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </div>

      {groups.map((group) => (
        <div className="sidebar__group" key={group.label}>
          <span className="sidebar__group-label">{group.label}</span>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={onClose}
              className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar__footer">
        <ThemeToggle />
        <button type="button" className="sidebar__button" onClick={onChangePassword}>
          <Icon name="key" />
          <span>Change password</span>
        </button>
        <button type="button" className="sidebar__button" onClick={logout}>
          <Icon name="logout" />
          <span>Log out</span>
        </button>
      </div>
    </nav>
  )
}
