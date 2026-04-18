-- Fix unique constraint on sync_exchange_sessions to allow same session_index across different skill pairs

-- First ensure skill_pair_index column exists
ALTER TABLE sync_exchange_sessions
ADD COLUMN IF NOT EXISTS skill_pair_index INTEGER;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_sync_sessions_skill_pair 
ON sync_exchange_sessions(cycle_id, skill_pair_index);

-- Drop the old constraint that only covers (cycle_id, session_index)
ALTER TABLE sync_exchange_sessions
  DROP CONSTRAINT IF EXISTS sync_exchange_sessions_cycle_id_session_index_key;

-- Add new constraint that allows same session_index per pair within a cycle
ALTER TABLE sync_exchange_sessions
  ADD CONSTRAINT sync_exchange_sessions_cycle_pair_index_unique
  UNIQUE (cycle_id, skill_pair_index, session_index);
