# SecureVault

A secure file storage and sharing web app — built from scratch in phases.

Users can upload files, keep them private by default, and optionally share them via a public link. Every action is logged so there's always a clear record of what happened.

---

## Planned Features

- Account registration and login (bcrypt + JWT)
- Upload, download, and delete files
- Private files by default — toggle a public share link per file
- Activity log: login, upload, download, delete, and share events
- Dashboard with storage stats and file list

---

## Tech Stack

| Layer    | Technology                    |
|----------|-------------------------------|
| Frontend | React 18, React Router 7      |
| Backend  | Node.js, Express              |
| Database | PostgreSQL                    |
| Auth     | JWT + bcrypt                  |
| Storage  | Local filesystem              |
| Bundler  | Vite                          |

---

## Build Phases

| Phase | What gets added                                    | Status      |
|-------|----------------------------------------------------|-------------|
| 1     | Project scaffold — both servers start, health check | ✅ Done     |
| 2     | PostgreSQL schema + user auth (register / login)   | ✅ Done     |
| 3     | File upload, download, and delete                  | Upcoming    |
| 4     | Public share links + activity logging              | Upcoming    |
| 5     | Security hardening + error handling                | Upcoming    |

---

## Phase 2 — Auth

### What was added

- **PostgreSQL pool** (`backend/src/db.js`) — shared connection pool via `pg`
- **Schema** (`backend/src/schema.sql`) — `users` table (id, email, hashed password, created_at)
- **Auth routes** (`backend/src/routes/auth.js`)
  - `POST /api/auth/register` — validate, bcrypt hash, insert user
  - `POST /api/auth/login` — compare hash, return signed JWT
- **Frontend routing** (React Router 7) — `/login`, `/register`, `/dashboard`
- **Route guards** — `ProtectedRoute` redirects to `/login` if unauthenticated; `GuestRoute` redirects to `/dashboard` if already logged in

### Requirements

- [Node.js 18+](https://nodejs.org)
- [PostgreSQL 14+](https://www.postgresql.org)

### Database setup

Create the database and run the schema:

```bash
psql -U postgres -c "CREATE DATABASE securevault;"
psql -U postgres -d securevault -f backend/src/schema.sql
```

### Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Configure

```bash
# Mac / Linux
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Windows
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Edit `backend/.env` and fill in your database password and a strong `JWT_SECRET`.

### Run

Open two terminals:

```bash
# Terminal 1 – backend
cd backend
npm run dev

# Terminal 2 – frontend
cd frontend
npm run dev
```

- Frontend → http://localhost:5173
- API health check → http://localhost:5000/api/health

---

## Project Structure (Phase 2)

```
SecureVault/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── auth.js         # Register + login endpoints
│   │   ├── app.js
│   │   ├── db.js               # PostgreSQL connection pool
│   │   └── schema.sql          # Database schema
│   ├── uploads/                # File storage — added in Phase 3
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
└── .gitignore
```

---

## License

MIT
