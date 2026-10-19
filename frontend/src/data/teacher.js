// Sample data until the dashboard is connected to the API
export const teacherUser = {
  name: 'Prof. Arjun Menon',
  courses: 'Database Management for 2025–29 Sec A and Sec B, Computer Science.',
}

// Fixed demo time so the timeline matches the sample timetable
export const DEMO_NOW = '11:20'

export const teacherStats = [
  { label: 'Classes today', value: '3', note: 'plus one office hour' },
  { label: 'Attendance to mark', value: '1', note: 'DBMS, Sec A, right now', tone: 'amber' },
  { label: 'Average in your courses', value: '82%', note: 'across 142 students' },
  { label: 'Below 75%', value: '9', note: 'students to follow up', tone: 'red' },
]

export const teacherPeriods = [
  { start: '9:00', end: '9:50', title: 'DBMS, Sec B', place: 'Marked, 66 of 70' },
  { start: '10:50', end: '11:40', title: 'DBMS, Sec A', place: 'Room 204' },
  { start: '12:30', end: '13:20', title: 'Lunch', place: 'Staff room', kind: 'break' },
  { start: '13:20', end: '15:00', title: 'DBMS Lab, Sec A', place: 'Lab 3, batch 1' },
  { start: '15:00', end: '15:50', title: 'Office hour', place: 'Cabin 12' },
]

export const currentClass = {
  title: 'Database Management, 2025–29 Sec A',
  ends: '11:40',
  detail: 'CS202 in Room 204, 72 students. Attendance is not marked yet.',
}

export const studentsToWatch = [
  { name: 'Ishita Bose', course: 'DBMS, 2025–29 Sec B', attendance: 62, missed: 'missed 9 of 24' },
  { name: 'Karan Malhotra', course: 'DBMS, 2025–29 Sec A', attendance: 67, missed: 'missed 8 of 24' },
  { name: 'Pooja Reddy', course: 'DBMS Lab, 2025–29 Sec A', attendance: 70, missed: 'missed 3 of 10' },
  { name: 'Vivek Jain', course: 'DBMS, 2025–29 Sec B', attendance: 71, missed: 'missed 7 of 24' },
  { name: 'Tanya Singh', course: 'DBMS, 2025–29 Sec A', attendance: 73, missed: 'missed 6 of 22' },
]

export const noticeTargets = ['DBMS, 2025–29 Sec A', 'DBMS, 2025–29 Sec B', 'All my classes']
