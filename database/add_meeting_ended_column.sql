-- Adds the missing meeting_ended column used by the end-meeting endpoint
-- Safe to run multiple times.

ALTER TABLE sync_exchange_sessions
    ADD COLUMN IF NOT EXISTS meeting_ended BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: any session already marked completed should reflect meeting ended
UPDATE sync_exchange_sessions
SET meeting_ended = TRUE
WHERE status = 'completed' AND meeting_ended = FALSE;
