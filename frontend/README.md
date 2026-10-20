# Nexus Campus frontend

React + Vite app with the dashboards for Admin, HOD, Teacher and Student.

## Run it

```
npm install
npm run dev
```

Then open:

- http://localhost:5173/admin
- http://localhost:5173/hod
- http://localhost:5173/teacher
- http://localhost:5173/student

## Folder layout

- `src/components` reusable parts (sidebar, header, panels, charts)
- `src/pages` one page per dashboard
- `src/data` sample data for now, will come from the API later
- `src/styles` theme colours and layout css
- `src/utils` small helpers (dates, names, attendance maths)
