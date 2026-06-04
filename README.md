# SecureVault

A full-stack secure file storage and sharing web app — think simplified Google Drive. Built with React, Node.js/Express, and PostgreSQL.

> Built as a portfolio MVP to demonstrate full-stack fundamentals: auth, file handling, access control, and activity logging.

---

## Features

- **Auth** — Register, login, JWT sessions, bcrypt-hashed passwords
- **File management** — Upload (drag & drop or click), download, delete
- **Access control** — Files are private by default; owners can generate a public share link
- **Activity log** — Every login, upload, download, delete, and share toggle is recorded
- **Dashboard** — Live stats (file count, storage used, public files), file list, recent activity
- **Security** — Helmet headers, rate limiting, no raw paths exposed, input validation

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, React Router 6, Axios   |
| Backend   | Node.js, Express 4                |
| Database  | PostgreSQL                        |
| Auth      | JWT + bcryptjs                    |
| Storage   | Local filesystem (UUID filenames) |
| Bundler   | Vite                              |

---

## Project Structure

```
SecureVault/
├── backend/
│   ├── database/
│   │   └── schema.sql            # Run once to create tables
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js       # pg Pool setup
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── fileController.js
│   │   │   └── activityController.js
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verification
│   │   │   ├── upload.js         # Multer config (50 MB, type whitelist)
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── files.js
│   │   │   └── activity.js
│   │   ├── utils/
│   │   │   └── logger.js         # Activity log helper
│   │   └── app.js                # Express app setup
│   ├── uploads/                  # Stored files (gitignored)
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js         # Axios instance + interceptors
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global auth state
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── .gitignore
```

---

## Database Schema

```sql
users
  id            SERIAL PK
  username      VARCHAR(50) UNIQUE
  email         VARCHAR(255) UNIQUE
  password_hash VARCHAR(255)
  created_at    TIMESTAMPTZ

files
  id            SERIAL PK
  owner_id      → users.id  (CASCADE delete)
  original_name VARCHAR(255)     -- shown to users
  stored_name   VARCHAR(255)     -- UUID filename on disk
  mime_type     VARCHAR(100)
  size          BIGINT
  is_public     BOOLEAN DEFAULT false
  share_token   VARCHAR(36) UNIQUE  -- UUID, set when made public
  created_at    TIMESTAMPTZ

activity_logs
  id         SERIAL PK
  user_id    → users.id  (SET NULL on delete)
  action     VARCHAR(50)  -- login|register|upload|download|delete|share_on|share_off|public_download
  file_id    → files.id   (SET NULL on delete)
  details    TEXT
  ip_address VARCHAR(45)
  created_at TIMESTAMPTZ
```

---

## API Reference

### Auth

| Method | Endpoint              | Auth | Description              |
|--------|-----------------------|------|--------------------------|
| POST   | /api/auth/register    | —    | Create account           |
| POST   | /api/auth/login       | —    | Login, returns JWT       |
| GET    | /api/auth/me          | JWT  | Get current user         |

### Files

| Method | Endpoint                     | Auth | Description                        |
|--------|------------------------------|------|------------------------------------|
| GET    | /api/files                   | JWT  | List own files                     |
| GET    | /api/files/stats             | JWT  | File count + total storage         |
| POST   | /api/files/upload            | JWT  | Upload file (multipart/form-data)  |
| GET    | /api/files/:id/download      | JWT  | Download (owner only)              |
| DELETE | /api/files/:id               | JWT  | Delete (owner only)                |
| PATCH  | /api/files/:id/share         | JWT  | Toggle public/private              |
| GET    | /api/files/public/:token     | —    | Download via public share link     |

### Activity

| Method | Endpoint        | Auth | Description              |
|--------|-----------------|------|--------------------------|
| GET    | /api/activity   | JWT  | Get own activity logs    |

Query params: `?limit=20&offset=0`

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Clone and install

```bash
git clone https://github.com/your-username/SecureVault.git
cd SecureVault

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Create the database

```bash
psql -U postgres -c "CREATE DATABASE securevault;"
psql -U postgres -d securevault -f backend/database/schema.sql
```

### 3. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DB credentials and a JWT secret

# Frontend (optional — proxy works out of the box in dev)
cp frontend/.env.example frontend/.env
```

**backend/.env minimum config:**
```
DB_PASSWORD=your_postgres_password
JWT_SECRET=any_long_random_string_here
```

### 4. Run in development

Open two terminals:

```bash
# Terminal 1 — backend
cd backend
npm run dev      # nodemon on port 5000

# Terminal 2 — frontend
cd frontend
npm run dev      # Vite on port 5173
```

Open [http://localhost:5173](http://localhost:5173).

---

## How It Works (Data Flow)

```
Browser (React)
    │
    │  HTTP + Bearer token
    ▼
Express API (port 5000)
    │
    ├── JWT middleware validates token on protected routes
    │
    ├── Auth routes → bcrypt hash/verify → issue JWT
    │
    ├── File routes → Multer saves UUID-named file to /uploads
    │                → metadata stored in PostgreSQL
    │                → activity logged
    │
    └── Public file route → looks up share_token + is_public flag
                         → streams file directly, no auth needed
```

Tokens live in `localStorage`. The Vite dev proxy forwards `/api/*` to `localhost:5000` so there are no CORS issues in development.

---

## Security Notes

- Passwords hashed with bcrypt (cost factor 12)
- Stored filenames are UUIDs — original names never touch the filesystem
- Rate limiter on all `/api/*` routes (200 req / 15 min)
- Helmet sets secure HTTP headers
- File type and size validated server-side (50 MB, explicit MIME whitelist)
- Timing-safe login: bcrypt runs on a dummy hash even for unknown emails
- JWT expiry: 24 h (configurable via `JWT_EXPIRES_IN`)

---

## Possible Future Improvements

1. **Folder / directory support** — let users organise files into named folders
2. **Per-file password protection** — require a passphrase to download a shared file
3. **Storage quota per user** — cap how much each account can store
4. **Shared-with-me** — share files directly to another registered user by email
5. **File previews** — render images and PDFs inline in the browser instead of forcing a download

---

## License

MIT — use freely for learning, portfolios, or as a starting point for a real product.
