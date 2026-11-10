// Sidebar menu for each role. Pages that are not built yet show a "coming soon" panel.
export const navigation = {
  admin: {
    label: 'Admin workspace',
    groups: [
      { label: 'Overview', items: [{ label: 'Dashboard', icon: 'dashboard', to: '/admin' }] },
      {
        label: 'Manage',
        items: [
          { label: 'Users', icon: 'users', to: '/admin/users' },
          { label: 'Departments and batches', icon: 'department', to: '/admin/departments' },
          { label: 'Courses', icon: 'book', to: '/admin/courses' },
          { label: 'Timetable', icon: 'calendar', to: '/admin/timetable' },
          { label: 'Impact score reviews', icon: 'star', to: '/admin/activities' },
          { label: 'Study material', icon: 'file', to: '/admin/materials' },
          { label: 'OJT', icon: 'briefcase', to: '/admin/ojt' },
        ],
      },
      {
        label: 'Communicate',
        items: [
          { label: 'Attendance reports', icon: 'chart', to: '/admin/reports' },
          { label: 'Notices', icon: 'notice', to: '/admin/notices' },
          { label: 'Sessions', icon: 'video', to: '/admin/sessions' },
          { label: 'Internships', icon: 'send', to: '/admin/internships' },
          { label: 'Settings', icon: 'settings', to: '/admin/settings' },
        ],
      },
    ],
  },
  hod: {
    label: 'Head of department',
    groups: [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', icon: 'dashboard', to: '/hod' },
          { label: 'My department', icon: 'department', to: '/hod/department' },
        ],
      },
      {
        label: 'People',
        items: [
          { label: 'Faculty', icon: 'users', to: '/hod/faculty' },
          { label: 'Students', icon: 'student', to: '/hod/students' },
        ],
      },
      {
        label: 'Academics',
        items: [
          { label: 'Timetable', icon: 'calendar', to: '/hod/timetable' },
          { label: 'Attendance', icon: 'checklist', to: '/hod/attendance' },
          { label: 'Notices', icon: 'notice', to: '/hod/notices' },
        ],
      },
    ],
  },
  teacher: {
    label: 'Teacher',
    groups: [
      {
        label: 'Teaching',
        items: [
          { label: 'Today', icon: 'sun', to: '/teacher' },
          { label: 'My courses', icon: 'book', to: '/teacher/courses' },
          { label: 'Mark attendance', icon: 'checklist', to: '/teacher/attendance' },
          { label: 'Timetable', icon: 'calendar', to: '/teacher/timetable' },
        ],
      },
      {
        label: 'Class life',
        items: [
          { label: 'Students', icon: 'users', to: '/teacher/students' },
          { label: 'Notices', icon: 'notice', to: '/teacher/notices' },
        ],
      },
    ],
  },
  student: {
    label: 'Student',
    groups: [
      {
        label: 'Workspace',
        items: [
          { label: 'Today', icon: 'sun', to: '/student' },
          { label: 'Attendance', icon: 'checklist', to: '/student/attendance' },
          { label: 'Impact score', icon: 'star', to: '/student/impact' },
          { label: 'Timetable', icon: 'calendar', to: '/student/timetable' },
          { label: 'Courses', icon: 'book', to: '/student/courses' },
          { label: 'Study material', icon: 'file', to: '/student/materials' },
          { label: 'OJT', icon: 'briefcase', to: '/student/ojt' },
        ],
      },
      {
        label: 'Student life',
        items: [
          { label: 'Notices', icon: 'notice', to: '/student/notices' },
          { label: 'Sessions', icon: 'video', to: '/student/sessions' },
          { label: 'Internships', icon: 'send', to: '/student/internships' },
          { label: 'Profile', icon: 'user', to: '/student/profile' },
        ],
      },
    ],
  },
}
