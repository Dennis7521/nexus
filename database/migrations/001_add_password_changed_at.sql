-- Migration: Add password_changed_at column to users table
-- Purpose: Allows token invalidation after password resets/changes.
--          Any JWT issued before this timestamp is rejected by authenticateToken.
-- Run: psql -d nexus_db -f database/migrations/001_add_password_changed_at.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
