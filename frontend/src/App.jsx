import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import { useAuth } from './context/useAuth.js'
import { homeFor } from './utils/roles.js'
import LoginPage from './pages/LoginPage.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import HodDashboard from './pages/HodDashboard.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import DepartmentsPage from './pages/admin/DepartmentsPage.jsx'
import ImpactReviewPage from './pages/admin/ImpactReviewPage.jsx'
import ImpactScorePage from './pages/student/ImpactScorePage.jsx'
import NoticesPage from './pages/student/NoticesPage.jsx'
import NoticesAdminPage from './pages/admin/NoticesAdminPage.jsx'
import MaterialsPage from './pages/student/MaterialsPage.jsx'
import MaterialsAdminPage from './pages/admin/MaterialsAdminPage.jsx'
import UsersPage from './pages/admin/UsersPage.jsx'
import CoursesPage from './pages/admin/CoursesPage.jsx'
import TakeAttendancePage from './pages/teacher/TakeAttendancePage.jsx'
import AttendancePage from './pages/student/AttendancePage.jsx'
import OjtPage from './pages/student/OjtPage.jsx'
import OjtAdminPage from './pages/admin/OjtAdminPage.jsx'
import SessionsPage from './pages/student/SessionsPage.jsx'
import InternshipsPage from './pages/student/InternshipsPage.jsx'
import SessionsAdminPage from './pages/admin/SessionsAdminPage.jsx'
import InternshipsAdminPage from './pages/admin/InternshipsAdminPage.jsx'
import BatchStudentsPage from './pages/batch/BatchStudentsPage.jsx'

// Which roles can open each dashboard.
// HOD is not a backend role yet, so admin can open it for now.
const dashboards = [
  {
    path: 'admin',
    page: <AdminDashboard />,
    allow: ['admin'],
    pages: [
      { path: 'departments', element: <DepartmentsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'courses', element: <CoursesPage /> },
      { path: 'activities', element: <ImpactReviewPage /> },
      { path: 'notices', element: <NoticesAdminPage /> },
      { path: 'materials', element: <MaterialsAdminPage /> },
      { path: 'ojt', element: <OjtAdminPage /> },
      { path: 'sessions', element: <SessionsAdminPage /> },
      { path: 'internships', element: <InternshipsAdminPage /> },
    ],
  },
  {
    path: 'hod',
    page: <HodDashboard />,
    allow: ['admin', 'hod'],
    pages: [{ path: 'attendance', element: <TakeAttendancePage /> }],
  },
  // Batch manager: the same review and posting pages as admin, the server limits them to their batches
  {
    path: 'batch',
    page: <BatchStudentsPage />,
    allow: ['batch_manager'],
    pages: [
      { path: 'activities', element: <ImpactReviewPage /> },
      { path: 'ojt', element: <OjtAdminPage /> },
      { path: 'notices', element: <NoticesAdminPage /> },
      { path: 'materials', element: <MaterialsAdminPage /> },
      { path: 'sessions', element: <SessionsAdminPage /> },
      { path: 'internships', element: <InternshipsAdminPage /> },
    ],
  },
  {
    path: 'teacher',
    page: <TeacherDashboard />,
    allow: ['teacher'],
    pages: [{ path: 'attendance', element: <TakeAttendancePage /> }],
  },
  {
    path: 'student',
    page: <StudentDashboard />,
    allow: ['student'],
    pages: [
      { path: 'impact', element: <ImpactScorePage /> },
      { path: 'notices', element: <NoticesPage /> },
      { path: 'materials', element: <MaterialsPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'ojt', element: <OjtPage /> },
      { path: 'sessions', element: <SessionsPage /> },
      { path: 'internships', element: <InternshipsPage /> },
    ],
  },
]

function Home() {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-loading">Loading...</div>
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      {dashboards.map(({ path, page, allow, pages = [] }) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <RequireAuth allow={allow}>
              <DashboardLayout role={path} />
            </RequireAuth>
          }
        >
          <Route index element={page} />
          {pages.map((sub) => (
            <Route key={sub.path} path={sub.path} element={sub.element} />
          ))}
          <Route path="*" element={<ComingSoon />} />
        </Route>
      ))}
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
