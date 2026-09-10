import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { THEME_CHOICES, THEME_LABELS, getThemeChoice, onThemeChoice, saveThemeChoice } from '../../utils/theme.js'

const ICONS = { system: 'monitor', light: 'sun', dark: 'moon' }

// Sidebar button: each click moves Auto -> Light -> Dark -> Auto
export default function ThemeToggle({ collapsed }) {
  const [choice, setChoice] = useState(getThemeChoice)
  useEffect(() => onThemeChoice(setChoice), [])

  function next() {
    const value = THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % THEME_CHOICES.length]
    saveThemeChoice(value)
    setChoice(value)
  }

  const label = `Theme: ${THEME_LABELS[choice]}`
  return (
    <button type="button" className="sidebar__button" onClick={next} title={collapsed ? label : 'Change theme'}>
      <Icon name={ICONS[choice]} />
      <span className="sidebar__text">{label}</span>
    </button>
  )
}
