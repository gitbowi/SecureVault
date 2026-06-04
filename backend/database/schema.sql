-- SecureVault Database Schema
-- Run this file once to set up your database:
--   psql -U postgres -d securevault -f schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(50)  UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id            SERIAL PRIMARY KEY,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(255) NOT NULL,   -- UUID-based filename on disk
  mime_type     VARCHAR(100) NOT NULL,
  size          BIGINT NOT NULL,
  is_public     BOOLEAN DEFAULT FALSE,
  share_token   VARCHAR(36) UNIQUE,      -- UUID token for public links
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL,  -- login | register | upload | download | delete | share_on | share_off | public_download
  file_id    INTEGER REFERENCES files(id) ON DELETE SET NULL,
  details    TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_files_owner_id        ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_share_token     ON files(share_token);
CREATE INDEX IF NOT EXISTS idx_activity_user_id      ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at   ON activity_logs(created_at DESC);
