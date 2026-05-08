# TaskPilot

**A full-stack team task management application built with React, Node.js, and PostgreSQL.**

TaskPilot helps teams organize projects, assign tasks, and collaborate — all from one clean, modern interface with a Kanban board, real-time notifications, and role-based access control.

---

## Live Demo

**[etharaaibypriyabart-production.up.railway.app](https://etharaaibypriyabart-production.up.railway.app)**

---

## Features

### Authentication & Session Management
- Secure signup & login with **JWT access + refresh token rotation**
- Passwords hashed with **bcrypt** (12 salt rounds)
- **1-hour session timeout** with auto-logout on inactivity
- Password visibility toggle on login/signup forms
- Input validation with **Zod** schema validation

### Global Role-Based Access Control
- **First user to sign up becomes the Admin** — all subsequent users are Members
- Admin can **transfer admin role** to another user (two-step confirmation)
- Admin can **host co-admins** (up to 3 per project)
- Members cannot create projects — they must be added by an admin

### Project Management
- Create, edit, and delete projects with custom color labels
- Add/remove team members from projects
- **Kanban board** with three columns: To Do, In Progress, Done
- Activity log tracking all project actions (task creation, member additions, admin transfers)

### Task Management
- Create tasks with title, description, priority (Low/Medium/High/Urgent), and due dates
- **Assign tasks** to any registered user — admin users shown with (Admin) badge
- Drag tasks between status columns on the Kanban board
- Members can only update the status of their own assigned tasks
- Admins have full control: create, edit, assign, and delete tasks
- Overdue task detection and warnings

### Project Discussion
- Collapsible **discussion/comment section** within each project
- All project members can post comments and suggestions
- Role badges displayed next to commenter names
- Admins can delete any comment; members can delete their own

### Notification System
- Real-time notification bell with **unread count badge**
- Notifications triggered on:
  - Being added to a project
  - Being assigned a task
  - New comments on your project
- Click-to-navigate: clicking a notification takes you to the relevant project
- Mark individual or all notifications as read
- Auto-polls every 15 seconds for new notifications

### Dashboard & Analytics
- **Pie chart** — task distribution by status (To Do / In Progress / Done)
- **Bar chart** — tasks per team member
- Stat cards: Total Tasks, In Progress, Overdue, Projects
- Upcoming deadlines list
- Recent activity feed across all projects

### Dark Mode
- Toggle between **light and dark themes** from the sidebar
- Preference saved to localStorage and persists across sessions
- Auto-detects system theme on first visit
- Full dark mode support across all pages, modals, and components

### User Experience
- Responsive design — works on desktop, tablet, and mobile
- User profile section in sidebar showing name, email, and role badge
- Admin avatars highlighted with amber ring on project board
- Searchable user list when adding members to a project
- Loading skeletons and smooth transitions throughout

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL (production), Prisma ORM |
| **Auth** | JSON Web Tokens (access + refresh), bcrypt.js |
| **Validation** | Zod |
| **Deployment** | Railway (single service — API serves frontend build) |

---

## Project Structure

```
TaskPilot/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Layout, shared components
│   │   ├── context/         # AuthContext, ThemeContext
│   │   ├── lib/             # Axios API client with interceptors
│   │   └── pages/           # Dashboard, Projects, ProjectBoard, MyTasks
│   └── ...
├── server/                  # Node.js backend (Express)
│   ├── prisma/
│   │   └── schema.prisma    # Database schema (8 models)
│   ├── src/
│   │   ├── controllers/     # Auth, Projects, Tasks, Dashboard, Notifications
│   │   ├── middleware/       # JWT auth, role-based access guards
│   │   ├── routes/          # API route definitions
│   │   └── utils/           # Prisma client, JWT helpers, validators
│   └── ...
├── package.json             # Root scripts (build, deploy)
└── railway.toml             # Railway deployment config
```

---

## Database Schema

The app uses **8 interconnected models**:

- **User** — accounts with global role (ADMIN/MEMBER)
- **Project** — team projects with color labels
- **ProjectMember** — many-to-many with per-project roles
- **Task** — tasks with status, priority, due dates, assignees
- **Comment** — comments on tasks
- **ProjectComment** — discussion comments on projects
- **Activity** — audit log of all actions
- **Notification** — user notifications with read status

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Priyabartkumar/EtharaAI_By_Priyabart.git
   cd EtharaAI_By_Priyabart
   ```

2. **Set up environment variables**
   ```bash
   cp server/.env.example server/.env
   ```
   Update `server/.env` with your database URL and JWT secrets:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/taskpilot"
   JWT_SECRET="your-secret-key"
   JWT_REFRESH_SECRET="another-secret-key"
   PORT=5000
   ```

3. **Install dependencies**
   ```bash
   npm run install:server
   npm run install:client
   ```

4. **Set up the database**
   ```bash
   cd server
   npx prisma db push
   npx prisma generate
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   npm run dev:server

   # Terminal 2 - Frontend
   npm run dev:client
   ```

6. **Open the app**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Create account | No |
| POST | `/api/auth/login` | Login | No |
| POST | `/api/auth/refresh` | Refresh token | No |
| GET | `/api/auth/me` | Current user | Yes |
| GET | `/api/auth/users` | All registered users | Yes |
| POST | `/api/auth/transfer-admin` | Transfer admin role | Yes |
| POST | `/api/auth/host-admin` | Add co-admin | Yes |
| GET | `/api/projects` | List projects | Yes |
| POST | `/api/projects` | Create project | Admin |
| GET | `/api/projects/:id` | Get project details | Member |
| POST | `/api/projects/:id/members` | Add member | Admin |
| POST | `/api/projects/:id/comments` | Add discussion comment | Member |
| GET | `/api/tasks/my-tasks` | Get assigned tasks | Yes |
| POST | `/api/projects/:id/tasks` | Create task | Admin |
| PUT | `/api/projects/:id/tasks/:taskId` | Update task | Yes |
| GET | `/api/dashboard/stats` | Dashboard stats | Yes |
| GET | `/api/dashboard/overview` | Dashboard overview | Yes |
| GET | `/api/notifications` | Get notifications | Yes |
| PUT | `/api/notifications/read-all` | Mark all read | Yes |

---

## Deployment

The app is deployed on **Railway** as a single service:
- Backend serves the frontend build as static files
- PostgreSQL database provided by Railway
- Auto-deploys on every push to `main`
- Health check endpoint: `/api/health`

---

## Author

**Priyabart Kumar Pandey**

Built as a full-stack coding assignment demonstrating proficiency in React, Node.js, database design, authentication, role-based access control, and cloud deployment.
