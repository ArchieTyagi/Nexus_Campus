import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function DashboardLayout({ role }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar role={role} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
