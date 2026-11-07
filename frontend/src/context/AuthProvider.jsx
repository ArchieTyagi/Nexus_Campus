import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { AuthContext } from './authContext.js'

const TOKEN_KEY = 'nexus_token'

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // Only wait for the server if a token was saved from last time
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  // On page load, check the saved token is still valid
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (!saved) return
    api('/auth/me', { token: saved })
      .then((data) => {
        setUser(data.user)
        setProfile(data.profile)
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(loginId, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { login: loginId, password },
    })
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    setProfile(data.profile)
    return data.user
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
