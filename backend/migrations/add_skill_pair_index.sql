-- Migration: Add skill_pair_index column to sync_exchange_sessions
-- This column tracks which skill pair (position_in_cycle) a session belongs to

-- Add the skill_pair_index column
ALTER TABLE sync_exchange_sessions
ADD COLUMN IF NOT EXISTS skill_pair_index INTEGER;

-- Add index for efficient querying by skill pair
CREATE INDEX IF NOT EXISTS idx_sync_sessions_skill_pair 
ON sync_exchange_sessions(cycle_id, skill_pair_index);

COMMENT ON COLUMN sync_exchange_sessions.skill_pair_index IS 
'Index of the skill pair this session belongs to (matches position_in_cycle of the teacher). NULL for cycle-wide sessions.';
