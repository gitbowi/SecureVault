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
| 3     | File upload, download, and delete                  | ✅ Done     |
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

## Phase 3 — Files

### What was added

- **Auth middleware** (`backend/src/middleware/auth.js`) — verifies JWT on every protected route
- **File routes** (`backend/src/routes/files.js`)
  - `POST /api/files/upload` — upload a file (max 10 MB, stored in `backend/uploads/`)
  - `GET /api/files` — list the signed-in user's files
  - `GET /api/files/:id/download` — download a file
  - `DELETE /api/files/:id` — delete a file from disk and the database
- **Schema** (`backend/src/schema.sql`) — `files` table (id, user_id FK, filename, original_name, size, mimetype, created_at)
- **Dashboard** rebuilt — file list with upload, download, and delete

### Database update

Run the updated schema to add the `files` table (safe to run again — uses `IF NOT EXISTS`):

```bash
psql -U postgres -d securevault -f backend/src/schema.sql
```

### Install

```bash
cd backend
npm install
```

---

## Project Structure

```
SecureVault/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js         # Register + login endpoints
│   │   │   └── files.js        # Upload, list, download, delete
│   │   ├── app.js
│   │   ├── db.js               # PostgreSQL connection pool
│   │   └── schema.sql          # Database schema
│   ├── uploads/                # Uploaded files (git-ignored)
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # File list, upload, download, delete
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
