// Sample data until the dashboard is connected to the API
export const hodUser = { name: 'Dr. Meera Iyer', detail: 'Computer Science', department: 'Computer Science and Engineering' }

export const departmentStats = [
  { label: 'Students', value: '412', note: 'in 6 batches' },
  { label: 'Faculty', value: '24', note: '2 on leave this week' },
  { label: 'Department attendance', value: '81%', note: 'up 2% from last month' },
  { label: 'Below 75%', value: '37', note: 'students need a follow up', tone: 'red' },
]

export const batchAttendance = [
  { name: '2025–29 Sec A', detail: 'Semester 3, 72 students', attendance: 84 },
  { name: '2025–29 Sec B', detail: 'Semester 3, 70 students', attendance: 79 },
  { name: '2024–28 Sec A', detail: 'Semester 5, 68 students', attendance: 81 },
  { name: '2024–28 Sec B', detail: 'Semester 5, 66 students', attendance: 73 },
  { name: '2023–27 Sec A', detail: 'Semester 7, 70 students', attendance: 77 },
  { name: '2022–26 Sec A', detail: 'Semester 9, 66 students', attendance: 71 },
]

export const studentsAtRisk = [
  { name: 'Aditya Kulkarni', roll: 'CS-24-0412', batch: '2024–28 B', attendance: 61, lowest: 'Operating Systems, 48%' },
  { name: 'Sneha Patil', roll: 'CS-22-0118', batch: '2022–26 A', attendance: 64, lowest: 'Compiler Design, 55%' },
  { name: 'Rahul Nair', roll: 'CS-24-0437', batch: '2024–28 B', attendance: 67, lowest: 'Computer Networks, 58%' },
  { name: 'Ishita Bose', roll: 'CS-25-0091', batch: '2025–29 B', attendance: 70, lowest: 'Discrete Mathematics, 62%' },
  { name: 'Mohammed Arif', roll: 'CS-23-0256', batch: '2023–27 A', attendance: 72, lowest: 'Cloud Computing, 64%' },
]

export const MAX_TEACHING_HOURS = 18

export const facultyLoad = [
  { name: 'Prof. Arjun Menon', hours: 20, courses: 'DBMS for 2025–29 A and B, DBMS Lab' },
  { name: 'Prof. Neha Kulkarni', hours: 17, courses: 'Data Structures for 2025–29 A and B' },
  { name: 'Dr. Rakesh Gupta', hours: 15, courses: 'Operating Systems, Computer Networks' },
  { name: 'Prof. Divya Shah', hours: 12, courses: 'Compiler Design, project guidance' },
  { name: 'Dr. Meera Iyer', hours: 6, courses: 'Software Engineering for 2023–27 A' },
]
