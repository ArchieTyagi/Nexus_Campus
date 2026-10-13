// Small CSV helpers for importing students and downloading their passwords.

// Splits CSV text into rows of cells.
// Handles quoted cells ("Sharma, Riya"), "" inside quotes, and Windows line endings.
export function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, '') // Excel adds this invisible mark at the start
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

// Header names we understand, written without spaces, dots or capitals
const COLUMNS = {
  name: ['name', 'fullname', 'studentname'],
  email: ['email', 'emailid', 'emailaddress', 'collegeemail', 'mail'],
  rollNumber: ['rollnumber', 'rollno', 'roll', 'enrollmentnumber', 'enrollmentno'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contact'],
}
const NEEDED = { name: 'Name', email: 'Email', rollNumber: 'Roll number' }
const simple = (header) => header.toLowerCase().replace(/[^a-z]/g, '')

// Reads a students CSV. Returns { students: [{ row, name, email, rollNumber, phone }] } or { error }.
// "row" is the row number the admin sees in Excel (the header is row 1).
export function readStudentCsv(text) {
  const rows = parseCsv(text)
  const isBlank = (cells) => cells.every((c) => c.trim() === '')
  const headerAt = rows.findIndex((cells) => !isBlank(cells))
  if (headerAt === -1) return { error: 'The file is empty.' }

  const headers = rows[headerAt].map(simple)
  const position = {}
  for (const [key, names] of Object.entries(COLUMNS)) {
    position[key] = headers.findIndex((h) => names.includes(h))
  }
  const missing = Object.keys(NEEDED).filter((key) => position[key] === -1)
  if (missing.length > 0) {
    return {
      error: `The first row must have column names. Missing: ${missing.map((k) => NEEDED[k]).join(', ')}.`,
    }
  }

  const students = []
  rows.forEach((cells, i) => {
    if (i <= headerAt || isBlank(cells)) return
    const get = (key) => (position[key] === -1 ? '' : (cells[position[key]] ?? '').trim())
    students.push({
      row: i + 1,
      name: get('name'),
      email: get('email'),
      rollNumber: get('rollNumber'),
      phone: get('phone'),
    })
  })
  if (students.length === 0) return { error: 'The file has column names but no students under them.' }
  return { students }
}

// Turns rows of values into CSV text. Every cell is quoted, so commas in names are safe.
function toCsv(rows) {
  return rows.map((cells) => cells.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

// Downloads rows as a .csv file. The mark at the start tells Excel the file is UTF-8, so names show correctly.
export function downloadCsv(fileName, rows) {
  const blob = new Blob(['\uFEFF' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
