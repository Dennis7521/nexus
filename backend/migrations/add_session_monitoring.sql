-- Migration: Add Session Monitoring Columns
-- Tracks actual join times and duration for admin audit

-- Add monitoring columns to exchange_sessions (one-on-one)
ALTER TABLE exchange_sessions
  ADD COLUMN IF NOT EXISTS mentor_joined_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS learner_joined_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_ended_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;

-- Add monitoring columns to sync_exchange_sessions (multi-party)
ALTER TABLE sync_exchange_sessions
  ADD COLUMN IF NOT EXISTS join_timestamps JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_ended_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;

-- Indexes for admin monitoring queries
CREATE INDEX IF NOT EXISTS idx_exchange_sessions_monitoring
  ON exchange_sessions(status, scheduled_at)
  WHERE mentor_joined_at IS NOT NULL OR learner_joined_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sync_sessions_monitoring
  ON sync_exchange_sessions(status, scheduled_at);
