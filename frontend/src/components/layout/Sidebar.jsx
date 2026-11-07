import { NavLink } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import Logo from '../ui/Logo.jsx'
import { navigation } from '../../config/navigation.js'
import { useAuth } from '../../context/useAuth.js'

export default function Sidebar({ role, collapsed, onToggle }) {
  const { label, groups } = navigation[role]
  const { logout } = useAuth()

  return (
    <nav className={`sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Main">
      <div className="sidebar__brand">
        <Logo />
        <div className="sidebar__text">
          <span className="sidebar__name">Nexus Campus</span>
          <span className="sidebar__role">{label}</span>
        </div>
      </div>

      {groups.map((group) => (
        <div className="sidebar__group" key={group.label}>
          <span className="sidebar__group-label">{group.label}</span>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={item.icon} />
              <span className="sidebar__text">{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <Icon name={collapsed ? 'expand' : 'collapse'} />
          <span className="sidebar__text">Collapse</span>
        </button>
        <button
          type="button"
          className="sidebar__button"
          onClick={logout}
          title={collapsed ? 'Log out' : undefined}
        >
          <Icon name="logout" />
          <span className="sidebar__text">Log out</span>
        </button>
      </div>
    </nav>
  )
}
