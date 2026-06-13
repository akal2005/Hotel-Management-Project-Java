-- ============================================================
-- MIGRATION 001 – Auth token columns
-- Run AFTER schema.sql if the database was created without them.
-- Safe to re-run: uses IF NOT EXISTS / column-exists guards.
-- ============================================================

USE hotel_management_db;

-- ── users: password reset ────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token   VARCHAR(255) DEFAULT NULL
    COMMENT 'SHA-256 hash of the raw reset token',
  ADD COLUMN IF NOT EXISTS password_reset_expires DATETIME    DEFAULT NULL
    COMMENT 'UTC expiry for the reset token';

-- ── users: email verification ────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verify_token    VARCHAR(255) DEFAULT NULL
    COMMENT 'SHA-256 hash of the raw verify token',
  ADD COLUMN IF NOT EXISTS email_verify_expires  DATETIME    DEFAULT NULL
    COMMENT 'UTC expiry for the verify token';

-- ── indexes for fast token look-up ───────────────────────────
-- (MySQL allows duplicate CREATE INDEX; use IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users (password_reset_token);

CREATE INDEX IF NOT EXISTS idx_users_verify_token
  ON users (email_verify_token);

-- ── Confirm ──────────────────────────────────────────────────
SELECT 'Migration 001 applied successfully' AS status;
