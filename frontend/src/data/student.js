// Sample data until the dashboard is connected to the API
export const studentUser = {
  name: 'Rohan Verma',
  roll: 'CS-25-0074',
  batch: '2025–2029, Computer Science and Engineering, Section A.',
}

// Fixed demo time so the timeline matches the sample timetable
export const DEMO_NOW = '11:20'

export const studentPeriods = [
  { start: '9:00', end: '9:50', label: 'CS201', title: 'Data Structures', place: 'Room 204' },
  { start: '9:50', end: '10:40', label: 'MA203', title: 'Discrete Maths', place: 'Room 204' },
  { start: '10:50', end: '11:40', label: 'CS202', title: 'DBMS', place: 'Room 204' },
  { start: '11:40', end: '12:30', label: 'MA204', title: 'Probability', place: 'Room 210' },
  { start: '12:30', end: '13:20', title: 'Lunch', place: 'Canteen', kind: 'break' },
  { start: '13:20', end: '15:00', label: 'CS252', title: 'DBMS Lab', place: 'Lab 3, batch 1' },
  { start: '15:00', end: '15:50', label: 'HS201', title: 'Communication', place: 'Room 105' },
]

// recent: last 12 classes, oldest first. P = present, A = absent
export const subjects = [
  { name: 'Data Structures', code: 'CS201', teacher: 'Prof. Neha Kulkarni', attended: 28, total: 32, recent: 'PPPAPPPPPPAP' },
  { name: 'Database Management', code: 'CS202', teacher: 'Prof. Arjun Menon', attended: 22, total: 28, recent: 'PPAPPPAPPPPP' },
  { name: 'Discrete Mathematics', code: 'MA203', teacher: 'Dr. Sanjay Rao', attended: 19, total: 27, recent: 'PAPPAAPPAPPP' },
  { name: 'Probability and Statistics', code: 'MA204', teacher: 'Dr. Lata Joshi', attended: 24, total: 30, recent: 'PPPPAPPAPPPP' },
  { name: 'DBMS Lab', code: 'CS252', teacher: 'Prof. Arjun Menon', attended: 10, total: 12, recent: 'PPPAPPPPPPAP' },
  { name: 'Professional Communication', code: 'HS201', teacher: 'Ms. Anjali Desai', attended: 15, total: 22, recent: 'APPAAPPPAPAP' },
]

export const notices = [
  { title: 'Mid-semester exams start on Monday, 2 November', meta: 'From the exam cell, yesterday', unread: true },
  { title: 'Submit DBMS lab records by Friday', meta: 'From Prof. Arjun Menon, today', unread: true },
  { title: 'Library closed on Saturday for stock check', meta: 'From the library, 17 October', unread: false },
]

export const events = [
  { month: 'Oct', day: '23', title: 'DBMS lab records due', detail: 'Staff room, by 4:00 pm' },
  { month: 'Nov', day: '2', title: 'Mid-semester exams begin', detail: 'Timetable in Notices' },
  { month: 'Nov', day: '14', title: 'Inter-college tech fest', detail: 'Registrations close 7 November' },
]
