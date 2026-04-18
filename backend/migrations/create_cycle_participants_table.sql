-- Migration: Create cycle_participants table
-- This table tracks individual participant status in exchange cycles

CREATE TABLE IF NOT EXISTS cycle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES exchange_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Participant's role in the cycle
  position_in_cycle INTEGER NOT NULL CHECK (position_in_cycle >= 0),
  skill_offering VARCHAR(255) NOT NULL,
  skill_receiving VARCHAR(255) NOT NULL,
  
  -- Acceptance status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status: pending, accepted, rejected
  
  -- Timestamps
  notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_participant_status CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT unique_cycle_participant UNIQUE (cycle_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cycle_participants_cycle ON cycle_participants(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_user ON cycle_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_status ON cycle_participants(status);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_user_status ON cycle_participants(user_id, status);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_cycle_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cycle_participants_updated_at
BEFORE UPDATE ON cycle_participants
FOR EACH ROW
EXECUTE FUNCTION update_cycle_participants_updated_at();

-- Trigger to update exchange_cycles acceptance count
CREATE OR REPLACE FUNCTION update_cycle_acceptance_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    UPDATE exchange_cycles 
    SET accepted_count = accepted_count + 1
    WHERE id = NEW.cycle_id;
  ELSIF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    UPDATE exchange_cycles 
    SET rejected_count = rejected_count + 1,
        status = 'rejected'
    WHERE id = NEW.cycle_id;
  END IF;
  
  -- Check if all participants accepted
  UPDATE exchange_cycles ec
  SET status = 'active',
      activated_at = CURRENT_TIMESTAMP
  WHERE ec.id = NEW.cycle_id
    AND ec.accepted_count = ec.total_participants
    AND ec.status = 'proposed';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cycle_acceptance
AFTER UPDATE OF status ON cycle_participants
FOR EACH ROW
EXECUTE FUNCTION update_cycle_acceptance_count();

-- Comments
COMMENT ON TABLE cycle_participants IS 'Tracks individual participant status in exchange cycles';
COMMENT ON COLUMN cycle_participants.position_in_cycle IS 'Order of participant in the cycle (0-indexed)';
COMMENT ON COLUMN cycle_participants.status IS 'Participant acceptance status';
