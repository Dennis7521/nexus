-- Migration: Add Sync Model (Credit-Free Multi-Party Exchange)
-- This migration adds support for the sync model where users participate in
-- multi-party skill exchange cycles without credit transactions.

-- ============================================================
-- Step 1: Add sync mode columns to exchange_cycles table
-- ============================================================

ALTER TABLE exchange_cycles
ADD COLUMN IF NOT EXISTS exchange_mode VARCHAR(20) NOT NULL DEFAULT 'sync'
CHECK (exchange_mode IN ('sync', 'credit'));

ALTER TABLE exchange_cycles
ADD COLUMN IF NOT EXISTS session_count INTEGER NOT NULL DEFAULT 5;

ALTER TABLE exchange_cycles
ADD COLUMN IF NOT EXISTS current_session_index INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN exchange_cycles.exchange_mode IS 'Exchange mode: sync (credit-free) or credit (future)';
COMMENT ON COLUMN exchange_cycles.session_count IS 'Number of sessions required for completion (sync mode only)';
COMMENT ON COLUMN exchange_cycles.current_session_index IS 'Current session number (sync mode only)';

-- ============================================================
-- Step 2: Add active_sync_exchange_id to users table
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS active_sync_exchange_id UUID REFERENCES exchange_cycles(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.active_sync_exchange_id IS 'ID of active sync exchange (NULL if not in sync mode)';

-- ============================================================
-- Step 3: Create sync_exchange_sessions table
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_exchange_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES exchange_cycles(id) ON DELETE CASCADE,
  session_index INTEGER NOT NULL,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link TEXT,
  topics_covered TEXT[],
  
  -- Verification
  verification_code VARCHAR(12) NOT NULL,
  
  -- Multi-party confirmation tracking
  -- Store confirmation status per participant as JSONB
  confirmations JSONB NOT NULL DEFAULT '{}',
  -- Format: { "user_id_1": { confirmed: true, confirmed_at: "timestamp", notes: "..." }, ... }
  
  -- Session evidence
  session_notes TEXT,
  
  -- Ratings (per participant)
  ratings JSONB NOT NULL DEFAULT '{}',
  -- Format: { "user_id_1": { rating: 5, review: "..." }, ... }
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  -- Status: scheduled, in_progress, completed, cancelled
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  UNIQUE(cycle_id, session_index),
  CONSTRAINT valid_session_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_sync_sessions_cycle ON sync_exchange_sessions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_status ON sync_exchange_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_scheduled ON sync_exchange_sessions(scheduled_at);

COMMENT ON TABLE sync_exchange_sessions IS 'Sessions for sync (credit-free) multi-party exchanges';
COMMENT ON COLUMN sync_exchange_sessions.confirmations IS 'JSONB tracking confirmation status per participant';
COMMENT ON COLUMN sync_exchange_sessions.ratings IS 'JSONB storing ratings per participant';

-- ============================================================
-- Step 4: Create function to enforce one active sync exchange per user
-- ============================================================

CREATE OR REPLACE FUNCTION check_single_active_sync_exchange()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already has an active sync exchange
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.user_id 
      AND active_sync_exchange_id IS NOT NULL 
      AND active_sync_exchange_id <> NEW.cycle_id
  ) THEN
    RAISE EXCEPTION 'User can only participate in one active sync exchange at a time';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Step 5: Create trigger to check single sync exchange on acceptance
-- ============================================================

DROP TRIGGER IF EXISTS trigger_check_single_sync_exchange ON cycle_participants;

CREATE TRIGGER trigger_check_single_sync_exchange
BEFORE UPDATE OF status ON cycle_participants
FOR EACH ROW
WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
EXECUTE FUNCTION check_single_active_sync_exchange();

-- ============================================================
-- Step 6: Create function to update user's active_sync_exchange_id
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_active_sync_exchange()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    -- Set active_sync_exchange_id for all participants
    UPDATE users u
    SET active_sync_exchange_id = NEW.id
    WHERE id IN (SELECT user_id FROM cycle_participants WHERE cycle_id = NEW.id);
  ELSIF NEW.status IN ('completed', 'rejected') AND OLD.status NOT IN ('completed', 'rejected') THEN
    -- Clear active_sync_exchange_id for all participants
    UPDATE users u
    SET active_sync_exchange_id = NULL
    WHERE active_sync_exchange_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Step 7: Create trigger to update user active sync exchange on cycle status change
-- ============================================================

DROP TRIGGER IF EXISTS trigger_update_user_active_sync ON exchange_cycles;

CREATE TRIGGER trigger_update_user_active_sync
AFTER UPDATE OF status ON exchange_cycles
FOR EACH ROW
EXECUTE FUNCTION update_user_active_sync_exchange();

-- ============================================================
-- Step 8: Create function to auto-update sync exchange progress
-- ============================================================

CREATE OR REPLACE FUNCTION update_sync_exchange_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Count completed sessions for this cycle
  DECLARE
    completed_count INTEGER;
    total_sessions INTEGER;
  BEGIN
    SELECT COUNT(*), MAX(session_index)
    INTO completed_count, total_sessions
    FROM sync_exchange_sessions
    WHERE cycle_id = NEW.cycle_id AND status = 'completed';
    
    -- Update current_session_index in exchange_cycles
    UPDATE exchange_cycles
    SET current_session_index = completed_count
    WHERE id = NEW.cycle_id;
    
    -- If all sessions completed, mark cycle as completed
    IF completed_count = total_sessions THEN
      UPDATE exchange_cycles
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = NEW.cycle_id;
    END IF;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Step 9: Create trigger to update progress on session completion
-- ============================================================

DROP TRIGGER IF EXISTS trigger_update_sync_progress ON sync_exchange_sessions;

CREATE TRIGGER trigger_update_sync_progress
AFTER UPDATE OF status ON sync_exchange_sessions
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION update_sync_exchange_progress();

-- ============================================================
-- Step 10: Add updated_at trigger to sync_exchange_sessions
-- ============================================================

CREATE OR REPLACE FUNCTION update_sync_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_sessions_updated_at
BEFORE UPDATE ON sync_exchange_sessions
FOR EACH ROW
EXECUTE FUNCTION update_sync_sessions_updated_at();

-- ============================================================
-- Migration Complete
-- ============================================================
