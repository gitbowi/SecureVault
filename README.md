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
| Frontend | React 18, React Router 6      |
| Backend  | Node.js, Express              |
| Database | PostgreSQL                    |
| Auth     | JWT + bcrypt                  |
| Storage  | Local filesystem              |
| Bundler  | Vite                          |

---

## Build Phases

| Phase | What gets added                                    | Status     |
|-------|----------------------------------------------------|------------|
| 1     | Project scaffold — both servers start, health check | ✅ Current |
| 2     | PostgreSQL schema + user auth (register / login)   | Upcoming   |
| 3     | File upload, download, and delete                  | Upcoming   |
| 4     | Public share links + activity logging              | Upcoming   |
| 5     | Security hardening + error handling                | Upcoming   |

---

## Phase 1 — Setup

### Requirements

- [Node.js 18+](https://nodejs.org)
- [PostgreSQL 14+](https://www.postgresql.org) *(needed from Phase 2)*

### Install

```bash
# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd ../frontend
npm install
```

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

## Project Structure (Phase 1)

```
SecureVault/
├── backend/
│   ├── src/
│   │   └── app.js          # Express app — routes added each phase
│   ├── uploads/            # File storage — added in Phase 3
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── .gitignore
```

---

## License

MIT
