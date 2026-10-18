# Nexus Campus

A college management web app where admins, teachers and students handle daily academic work in one place: users, courses, timetables, attendance and notices.

Built as our OJT project, and meant to actually be used by the college.

## Why

Right now this info lives in registers, Excel sheets, WhatsApp groups and notice boards. Students miss notices, attendance problems show up too late, and admins spend hours on manual updates.

Nexus Campus gives every person a login and a dashboard with only what they need.

## Features

| Module | Status | What it does |
| --- | --- | --- |
| Login and roles | Done | Login with email or roll number. Three roles: admin, teacher, student |
| Users | Done | Admin adds students and teachers, searches and filters, deactivates accounts |
| Departments and batches | Done | Admin creates departments (CSE, AI/ML) and batches (2025-2029 Sec A) |
| Courses | Done | Admin creates courses for a batch and assigns a teacher |
| Timetable | Done | Weekly timetable with automatic clash checking for teacher, batch and room |
| Attendance | Next | Teachers mark attendance, students see their %, warning below the minimum |
| Notices and events | Planned | Admin and teachers post notices to everyone, a department or a batch |
| Frontend dashboards | Planned | Separate dashboard for each role |

### Who can do what

| Action | Admin | Teacher | Student |
| --- | --- | --- | --- |
| Manage users, departments, batches | Yes | No | No |
| Create courses and timetable | Yes | No | No |
| View courses and timetable | All | Own classes | Own batch |
| View students in a batch | Yes | Yes | No |
| Change own password | Yes | Yes | Yes |

## Tech stack

| Part | Tech |
| --- | --- |
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT tokens, bcrypt password hashing |
| Security | Role checks on every route, login rate limit (5 tries / 15 min) |

## Project structure

```
Nexus_Campus/
├── frontend/              React + Vite app
│   └── src/
├── backend/
│   ├── src/
│   │   ├── config/        database connection
│   │   ├── models/        MongoDB schemas
│   │   ├── controllers/   logic for each feature
│   │   ├── routes/        API URLs
│   │   ├── middleware/    login check, role check, error handling
│   │   ├── utils/         small helpers
│   │   ├── scripts/       seedAdmin.js (creates the first admin)
│   │   └── server.js      starting point
│   └── .env.example
└── docs/
    ├── HLD.md             high level design
    └── LLD.md             low level design
```

## Getting started

You need [Node.js](https://nodejs.org) 18 or newer and a MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works).

### 1. Clone

```bash
git clone https://github.com/ArchieTyagi/Nexus_Campus.git
cd Nexus_Campus
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

- `MONGO_URI`: your MongoDB connection string
- `JWT_SECRET`: any long random string (`openssl rand -hex 32` makes one)
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: login for the first admin

Then:

```bash
npm run seed    # creates the first admin, run once
npm run dev     # starts the server on http://localhost:5000
```

Check it works: open http://localhost:5000/api/health

### 3. Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev     # opens on http://localhost:5173
```

## API

All routes start with `/api`. Everything except login needs the header `Authorization: Bearer <token>`.

| Method | Route | Who | What it does |
| --- | --- | --- | --- |
| POST | `/auth/login` | Everyone | Log in with `{ login, password }`, get a token |
| GET | `/auth/me` | Logged in | Current user and profile |
| POST | `/auth/change-password` | Logged in | Change own password |
| GET | `/users` | Admin | List users. Filters: `role`, `department`, `batch`, `search`, `page` |
| POST | `/users` | Admin | Create admin, teacher or student |
| GET, PATCH | `/users/:id` | Admin | View or edit a user |
| POST | `/users/:id/reset-password` | Admin | Give a user a new temporary password |
| GET, POST, PATCH | `/departments` | GET: all, rest: admin | Manage departments |
| GET, POST, PATCH | `/batches` | GET: all, rest: admin | Manage batches |
| GET | `/batches/:id/students` | Admin, teacher | Students in a batch |
| GET | `/courses` | Logged in | Courses (filtered by role) |
| POST, PATCH, DELETE | `/courses/:id` | Admin | Manage courses |
| GET | `/timetable` | Logged in | Weekly timetable (filtered by role) |
| GET | `/timetable/today` | Logged in | Today's classes |
| POST, PATCH, DELETE | `/timetable/:id` | Admin | Manage slots (clash checked) |

## Design docs

- [High level design (HLD)](docs/HLD.md): system overview, request flow, deployment
- [Low level design (LLD)](docs/LLD.md): database schema, modules, clash check logic

## Roadmap

- [x] PRD and planning
- [x] Login, roles, users, departments, batches
- [x] Courses and timetable with clash checking
- [ ] Attendance
- [ ] Notices and events
- [ ] Frontend pages and dashboards
- [ ] Pilot with one batch

- Archi Tyagi

## License

MIT, see [LICENSE](LICENSE).
