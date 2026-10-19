// Sample data until the dashboard is connected to the API
export const adminUser = { name: 'Kavita Rao', detail: 'Academic office' }

export const campusStats = [
  { label: 'Students', value: '1,248', note: 'in 14 batches' },
  { label: 'Teachers', value: '86', note: 'in 5 departments' },
  { label: 'Classes today', value: '132', note: '18 running right now' },
  { label: 'Attendance marked', value: '58 of 61', note: 'classes finished so far' },
]

export const attentionItems = [
  {
    severity: 'high',
    title: '3 classes ended without attendance',
    detail: 'CS301 and MA204 this morning, EC210 yesterday afternoon',
    action: 'Remind teachers',
  },
  {
    severity: 'high',
    title: 'Batch 2026–2030 Sec B has no timetable',
    detail: 'Classes for this batch start on Monday, 26 October',
    action: 'Build timetable',
  },
  {
    severity: 'mid',
    title: '4 courses have no teacher assigned',
    detail: 'All in Electronics and Communication, semester 3',
    action: 'Assign teachers',
  },
  {
    severity: 'low',
    title: '41 students are still on a temporary password',
    detail: 'They were added last week and have not logged in yet',
    action: 'Resend login details',
  },
]

export const departments = [
  { name: 'Computer Science and Engineering', batches: 4, students: 412, teachers: 24, attendance: 83 },
  { name: 'Artificial Intelligence and Machine Learning', batches: 3, students: 298, teachers: 17, attendance: 79 },
  { name: 'Electronics and Communication', batches: 3, students: 236, teachers: 15, attendance: 76 },
  { name: 'Mechanical Engineering', batches: 2, students: 152, teachers: 14, attendance: 72 },
  { name: 'Civil Engineering', batches: 2, students: 150, teachers: 16, attendance: 77 },
]

export const quickActions = [
  { label: 'Add a student', icon: 'addUser' },
  { label: 'Import students from Excel', icon: 'upload' },
  { label: 'Create a batch', icon: 'department' },
  { label: 'Build timetable', icon: 'calendar' },
]

export const liveClasses = [
  { room: '204', course: 'Database Management', detail: 'CS202 for 2025–29 A, Prof. Arjun Menon' },
  { room: 'Lab 2', course: 'Digital Electronics Lab', detail: 'EC251 for 2025–29 EC, Dr. Farah Khan' },
  { room: '311', course: 'Machine Learning', detail: 'AI301 for 2024–28 AI, Dr. Vikram Sethi' },
  { room: '108', course: 'Engineering Mechanics', detail: 'ME102 for 2026–30 ME, Prof. Ritu Das' },
]

export const recentNotices = [
  { title: 'Mid-semester exam timetable published', meta: 'Everyone, posted yesterday' },
  { title: 'Library closed on Saturday for stock check', meta: 'Everyone, posted 17 October' },
  { title: 'Project review panel for semester 7', meta: 'Computer Science, posted 16 October' },
]
