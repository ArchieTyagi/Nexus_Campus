import { NavLink } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import { navigation } from '../../config/navigation.js'

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--amber)" />
      <path
        d="M10 22V10l12 12V10"
        fill="none"
        stroke="var(--amber-ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Sidebar({ role, collapsed, onToggle }) {
  const { label, groups } = navigation[role]

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
      </div>
    </nav>
  )
}
