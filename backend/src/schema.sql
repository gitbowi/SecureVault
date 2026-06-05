CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS files (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size          BIGINT NOT NULL,
  mimetype      TEXT NOT NULL,
  share_token   TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: add share_token to existing files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS activity_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  file_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
