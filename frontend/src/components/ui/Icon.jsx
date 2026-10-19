// Simple stroke icons used across the app (24x24 grid)
const paths = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  users: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 5.15a3 3 0 0 1 0 5.7',
  department: 'M4 20V8l8-4 8 4v12M9 20v-5h6v5M4 20h16',
  book: 'M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM5 16a4 4 0 0 1 4-4h9',
  calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  chart: 'M5 20V10M12 20V4M19 20v-7',
  notice: 'M4 10v4h3l7 4V6L7 10zM18 9a4 4 0 0 1 0 6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.07-.4.1-.8.1-1.2',
  addUser: 'M15 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 3 17.5V19M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 8v6M16 11h6',
  upload: 'M12 15V4M7 9l5-5 5 5M4 15v5h16v-5',
  student: 'M12 4 2 9l10 5 10-5zM6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
  checklist: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 20a7 7 0 0 1 14 0',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  collapse: 'M4 4h16v16H4zM9 4v16M15 10l-2 2 2 2',
  expand: 'M4 4h16v16H4zM9 4v16M13 10l2 2-2 2',
}

export default function Icon({ name, size = 20, strokeWidth = 1.8, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  )
}
