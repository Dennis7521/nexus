-- Migration: Create exchange_cycles table for multi-party matching (Mode B)
-- This table stores detected exchange cycles (e.g., A→B→C→A)

CREATE TABLE IF NOT EXISTS exchange_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_length INTEGER NOT NULL CHECK (cycle_length >= 2 AND cycle_length <= 5),
  cycle_score INTEGER NOT NULL CHECK (cycle_score >= 0 AND cycle_score <= 100),
  status VARCHAR(50) NOT NULL DEFAULT 'proposed',
  -- Status: proposed, pending, active, completed, rejected
  
  -- Cycle data (stored as JSONB for flexibility)
  cycle_data JSONB NOT NULL,
  -- Format: [
  --   {userId: "uuid", skill: "Python", wantSkill: "Guitar", accepted: false},
  --   {userId: "uuid", skill: "Guitar", wantSkill: "Spanish", accepted: false},
  --   {userId: "uuid", skill: "Spanish", wantSkill: "Python", accepted: false}
  -- ]
  
  -- Acceptance tracking
  total_participants INTEGER NOT NULL,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  proposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_cycle_status CHECK (status IN ('proposed', 'pending', 'active', 'completed', 'rejected')),
  CONSTRAINT valid_acceptance_count CHECK (accepted_count <= total_participants),
  CONSTRAINT valid_rejection_count CHECK (rejected_count <= total_participants)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exchange_cycles_status ON exchange_cycles(status);
CREATE INDEX IF NOT EXISTS idx_exchange_cycles_length ON exchange_cycles(cycle_length);
CREATE INDEX IF NOT EXISTS idx_exchange_cycles_score ON exchange_cycles(cycle_score DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_cycles_created ON exchange_cycles(created_at DESC);

-- GIN index for JSONB queries (find cycles by participant)
CREATE INDEX IF NOT EXISTS idx_exchange_cycles_data ON exchange_cycles USING GIN (cycle_data);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_exchange_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_exchange_cycles_updated_at
BEFORE UPDATE ON exchange_cycles
FOR EACH ROW
EXECUTE FUNCTION update_exchange_cycles_updated_at();

-- Comments
COMMENT ON TABLE exchange_cycles IS 'Stores multi-party exchange cycles (Mode B) - persists until all accept or someone rejects';
COMMENT ON COLUMN exchange_cycles.cycle_data IS 'JSONB array of cycle participants and their exchange details';
COMMENT ON COLUMN exchange_cycles.cycle_score IS 'Overall cycle quality score (0-100)';
COMMENT ON COLUMN exchange_cycles.status IS 'Current state of the cycle proposal - persists until resolved';
