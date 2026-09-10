// Light, dark, or "system" (follow the phone or laptop setting). Saved per device.
const KEY = 'nexus_theme'
export const THEME_CHOICES = ['system', 'light', 'dark']
export const THEME_LABELS = { system: 'Auto', light: 'Light', dark: 'Dark' }

const deviceIsDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function getThemeChoice() {
  try {
    const saved = localStorage.getItem(KEY)
    return THEME_CHOICES.includes(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(choice) {
  const dark = choice === 'dark' || (choice === 'system' && deviceIsDark())
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function saveThemeChoice(choice) {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    // Private mode or blocked storage: the theme still changes for this visit
  }
  applyTheme(choice)
  // Lets every theme control on screen (sidebar, profile page) show the same choice
  window.dispatchEvent(new CustomEvent('nexus-theme', { detail: choice }))
}

// Calls back with the new choice whenever it changes anywhere in the app
export function onThemeChoice(callback) {
  const listener = (event) => callback(event.detail)
  window.addEventListener('nexus-theme', listener)
  return () => window.removeEventListener('nexus-theme', listener)
}

// On "Auto", switch straight away when the device changes between light and dark
export function followDeviceTheme() {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (getThemeChoice() === 'system') applyTheme('system')
  }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
