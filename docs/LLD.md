# Low Level Design

This page goes into the details: database collections, how the code is split, and how the main logic works.

## 1. Database schema

```mermaid
erDiagram
    USER ||--o| STUDENT : "has profile"
    USER ||--o| TEACHER : "has profile"
    DEPARTMENT ||--o{ BATCH : has
    DEPARTMENT ||--o{ STUDENT : has
    DEPARTMENT ||--o{ TEACHER : has
    DEPARTMENT ||--o{ COURSE : offers
    BATCH ||--o{ STUDENT : contains
    BATCH ||--o{ COURSE : takes
    TEACHER |o--o{ COURSE : teaches
    COURSE ||--o{ TIMETABLE_SLOT : "scheduled as"
    BATCH ||--o{ TIMETABLE_SLOT : attends
    TEACHER |o--o{ TIMETABLE_SLOT : takes

    USER {
        ObjectId _id
        string name
        string email "unique"
        string password "bcrypt hash, hidden"
        string role "admin | teacher | student"
        string phone
        boolean isActive
        boolean mustChangePassword
    }
    STUDENT {
        ObjectId user "unique"
        string rollNumber "unique"
        ObjectId department
        ObjectId batch
    }
    TEACHER {
        ObjectId user "unique"
        string employeeId "unique"
        ObjectId department
    }
    DEPARTMENT {
        string name
        string code "unique"
    }
    BATCH {
        string name
        ObjectId department
        number startYear
        number endYear
        number currentSemester
    }
    COURSE {
        string name
        string code "unique per batch"
        number credits
        number semester
        ObjectId department
        ObjectId batch
        ObjectId teacher
    }
    TIMETABLE_SLOT {
        ObjectId course
        ObjectId batch
        ObjectId teacher
        string day "Mon to Sat"
        string startTime "HH:MM"
        string endTime "HH:MM"
        string room
    }
```

**Why `User` is separate from `Student` and `Teacher`:** login works the same for everyone, so email, password and role live in one place. Role-specific details sit in their own collection.

**Why `TimetableSlot` copies `batch` and `teacher` from the course:** the clash check can then search slots directly, without looking up every course first.

### Indexes

| Collection | Index | Why |
| --- | --- | --- |
| users | email (unique) | Fast login, no duplicate emails |
| students | rollNumber (unique) | Login by roll number |
| batches | name + department (unique) | No duplicate batch names in a department |
| courses | code + batch (unique) | Same course can't be added twice to a batch |
| timetableslots | day + batch, day + teacher | Fast clash checks |

## 2. Backend code layout

Every request goes through the same layers.

```mermaid
flowchart LR
    R[routes/] --> M[middleware/<br/>protect, allow]
    M --> C[controllers/]
    C --> MO[models/]
    MO --> DB[(MongoDB)]
    C --> U[utils/<br/>AppError, token,<br/>profile, viewer]
    C -. errors .-> E[middleware/<br/>errorHandler]
```

| Folder | Files | Job |
| --- | --- | --- |
| `routes/` | authRoutes, userRoutes, departmentRoutes, courseRoutes, timetableRoutes | Map URLs to controller functions and attach role checks |
| `middleware/` | auth.js, errorHandler.js | `protect` checks the token, `allow(...roles)` checks the role, `errorHandler` turns errors into clean JSON |
| `controllers/` | authController, userController, departmentController, courseController, timetableController | The logic for each feature |
| `models/` | User, Student, Teacher, Department, Batch, Course, TimetableSlot | Mongoose schemas |
| `utils/` | AppError, token, profile, viewer | Small shared helpers |

### Middleware chain example

`POST /api/timetable` goes through:

```
protect  ->  allow("admin")  ->  createSlot  ->  errorHandler (only if something fails)
```

## 3. Role based data filter

`utils/viewer.js` decides what the logged-in person can see. Courses and timetable both use it.

```mermaid
flowchart TD
    START[Request from logged-in user] --> R{Role?}
    R -- student --> S[Find student profile<br/>filter = their batch]
    R -- teacher --> T[Find teacher profile<br/>filter = their classes]
    R -- admin --> A[No filter<br/>can use query params]
    S --> Q[Run database query with filter]
    T --> Q
    A --> Q
```

## 4. Timetable clash check

Two classes clash when **all three** are true:

1. Same day
2. Times overlap: `newStart < oldEnd` and `newEnd > oldStart`
3. They share the same batch, the same teacher, or the same room

Back-to-back classes (9:00 to 10:00, then 10:00 to 11:00) are allowed, because 10:00 is not less than 10:00.

```mermaid
flowchart TD
    IN[Admin sends course, day, start, end, room] --> C1{Course exists?}
    C1 -- no --> E1[404 Course not found]
    C1 -- yes --> C2{Time format HH:MM<br/>and day valid?}
    C2 -- no --> E2[400 Bad format]
    C2 -- yes --> C3{End after start?}
    C3 -- no --> E3[400 End time must be after start time]
    C3 -- yes --> C4[Search slots on same day<br/>with overlapping time<br/>and same batch OR teacher OR room]
    C4 --> C5{Found one?}
    C5 -- yes --> E4[409 Clash: says which class]
    C5 -- no --> OK[Save slot, return 201]
```

The same check runs when a slot is edited (ignoring the slot itself), and when a course gets a new teacher.

## 5. Create user flow

```mermaid
sequenceDiagram
    actor A as Admin
    participant C as userController
    participant DB as MongoDB

    A->>C: POST /api/users (role: student, rollNumber, batch...)
    C->>DB: Check batch exists and is in that department
    C->>C: Make 8 character temporary password
    C->>DB: Create User (password gets hashed)
    C->>DB: Create Student profile
    alt profile fails (e.g. duplicate roll number)
        C->>DB: Delete the User again
        C-->>A: 409 "This rollNumber is already in use"
    else ok
        C-->>A: 201 user + profile + tempPassword
    end
```

The temporary password is shown once so the admin can share it. The user must change it on first login.

## 6. Error handling

Controllers throw `new AppError(message, status)`. The error handler turns every error into `{ "message": "..." }`.

| Case | Status | Example message |
| --- | --- | --- |
| No or bad token | 401 | Please log in |
| Wrong role | 403 | You do not have permission to do this |
| Bad input | 400 | End time must be after start time |
| Not found | 404 | Course not found |
| Duplicate or clash | 409 | Clash: this teacher already has a class on Mon 09:00-10:00 (CS201) |
| Too many login tries | 429 | Too many wrong tries. Try again in 15 minutes |
| Anything else | 500 | Something went wrong |
