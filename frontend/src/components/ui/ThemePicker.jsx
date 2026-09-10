import { useEffect, useState } from 'react'
import { THEME_CHOICES, THEME_LABELS, getThemeChoice, onThemeChoice, saveThemeChoice } from '../../utils/theme.js'

const HINTS = { system: 'Follows your phone or laptop', light: 'Always light', dark: 'Always dark' }

// Three choices side by side, for the profile page
export default function ThemePicker() {
  const [choice, setChoice] = useState(getThemeChoice)
  useEffect(() => onThemeChoice(setChoice), [])

  return (
    <div className="segmented" role="radiogroup" aria-label="Theme">
      {THEME_CHOICES.map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          className={`segmented__option ${choice === value ? 'is-on' : ''}`}
          onClick={() => saveThemeChoice(value)}
        >
          <span className="segmented__label">{THEME_LABELS[value]}</span>
          <span className="segmented__hint">{HINTS[value]}</span>
        </button>
      ))}
    </div>
  )
}
