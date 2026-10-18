# High Level Design

This page shows the big picture: the parts of Nexus Campus and how they talk to each other.

## 1. System overview

Three types of users open the same React app in their browser. The app calls our Express API, which reads and writes MongoDB.

```mermaid
flowchart LR
    subgraph Users
        A[Admin]
        T[Teacher]
        S[Student]
    end

    subgraph Frontend["Frontend (React + Vite)"]
        UI[Pages and dashboards]
    end

    subgraph Backend["Backend (Node.js + Express)"]
        API[REST API /api]
        AUTH[Login and role check]
        LOGIC[Controllers]
    end

    DB[(MongoDB)]

    A --> UI
    T --> UI
    S --> UI
    UI -- "HTTPS + JWT token" --> API
    API --> AUTH --> LOGIC
    LOGIC --> DB
```

## 2. Main parts

| Part | Job |
| --- | --- |
| Frontend | Shows pages for each role, stores the login token, calls the API |
| API (Express) | Receives requests, checks login and role, sends back JSON |
| Auth middleware | Checks the JWT token, loads the user, blocks wrong roles |
| Controllers | The actual logic for each feature (users, courses, timetable...) |
| MongoDB | Stores all data |

## 3. Modules

```mermaid
flowchart TB
    AUTH[Auth<br/>login, change password]
    USERS[Users<br/>admin, teacher, student]
    ORG[Departments and batches]
    COURSES[Courses]
    TT[Timetable<br/>clash checking]
    ATT[Attendance<br/>next]
    NOT[Notices<br/>planned]

    AUTH --> USERS
    ORG --> USERS
    ORG --> COURSES
    USERS --> COURSES
    COURSES --> TT
    TT --> ATT
    USERS --> NOT

    classDef planned stroke-dasharray: 5 5
    class ATT,NOT planned
```

Each module depends on the ones above it. For example, a timetable slot needs a course, and a course needs a batch and a teacher.

## 4. How a request works

Example: a student opens their timetable.

```mermaid
sequenceDiagram
    actor S as Student
    participant FE as Frontend
    participant API as Express API
    participant MW as Auth middleware
    participant C as Timetable controller
    participant DB as MongoDB

    S->>FE: Open "My timetable"
    FE->>API: GET /api/timetable (token in header)
    API->>MW: protect()
    MW->>DB: Find user from token
    DB-->>MW: User (role: student)
    MW->>C: Continue
    C->>DB: Find student's batch
    C->>DB: Find slots for that batch
    DB-->>C: Slots
    C-->>FE: JSON list sorted Mon to Sat
    FE-->>S: Show weekly timetable
```

The student never sends their batch. The backend works it out from the token, so a student can't ask for another batch's data.

## 5. Login flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant API as Express API
    participant DB as MongoDB

    U->>FE: Enter email or roll number + password
    FE->>API: POST /api/auth/login
    API->>API: Rate limit check (5 tries / 15 min)
    API->>DB: Find user by email, or student by roll number
    DB-->>API: User with password hash
    API->>API: bcrypt compare password
    alt correct
        API-->>FE: token + user + profile
        FE->>FE: Save token
        FE-->>U: Go to dashboard for their role
    else wrong
        API-->>FE: 401 "Wrong login details"
    end
```

## 6. Security

- Passwords are stored only as bcrypt hashes, never as plain text
- Every protected route checks the token and the role on the backend
- Students and teachers only get data that belongs to them
- Login is limited to 5 wrong tries per 15 minutes
- New users get a temporary password and must change it
- Secrets live in `.env`, which is never pushed to GitHub

## 7. Deployment (planned)

```mermaid
flowchart LR
    B[Browser] --> V[Vercel<br/>frontend]
    V -- API calls --> R[Render<br/>backend]
    R --> M[(MongoDB Atlas)]
    G[GitHub repo] -. auto deploy .-> V
    G -. auto deploy .-> R
```

All three have free tiers, which is enough for a pilot with one batch.
