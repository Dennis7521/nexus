-- Migration: Remove expiry mechanism from exchange_cycles
-- Cycles now persist until all members accept or someone rejects

-- Remove expires_at column
ALTER TABLE exchange_cycles DROP COLUMN IF EXISTS expires_at;

-- Drop the expires index
DROP INDEX IF EXISTS idx_exchange_cycles_expires;

-- Update status constraint to remove 'expired' status
ALTER TABLE exchange_cycles DROP CONSTRAINT IF EXISTS valid_cycle_status;
ALTER TABLE exchange_cycles ADD CONSTRAINT valid_cycle_status 
  CHECK (status IN ('proposed', 'pending', 'active', 'completed', 'rejected'));

-- Update comment
COMMENT ON TABLE exchange_cycles IS 'Stores multi-party exchange cycles (Mode B) - persists until all accept or someone rejects';
