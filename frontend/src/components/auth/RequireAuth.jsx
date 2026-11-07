import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { homeFor } from '../../utils/roles.js'

// Shows the page only if the user is logged in and has the right role
export default function RequireAuth({ allow, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="auth-loading">Loading...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!allow.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />

  return children
}
