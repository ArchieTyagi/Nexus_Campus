import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import HodDashboard from './pages/HodDashboard.jsx'

// Until login is connected, each role's dashboard has its own URL
const dashboards = {
  admin: <AdminDashboard />,
  hod: <HodDashboard />,
  teacher: <ComingSoon />,
  student: <ComingSoon />,
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      {Object.entries(dashboards).map(([role, page]) => (
        <Route key={role} path={`/${role}`} element={<DashboardLayout role={role} />}>
          <Route index element={page} />
          <Route path="*" element={<ComingSoon />} />
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
