import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout.jsx'
import ComingSoon from './pages/ComingSoon.jsx'

// Until login is connected, each role's dashboard has its own URL
const roles = ['admin', 'hod', 'teacher', 'student']

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      {roles.map((role) => (
        <Route key={role} path={`/${role}`} element={<DashboardLayout role={role} />}>
          <Route index element={<ComingSoon />} />
          <Route path="*" element={<ComingSoon />} />
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
