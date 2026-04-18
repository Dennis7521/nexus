-- Create table to store synchronous multi-party exchange cycles
CREATE TABLE IF NOT EXISTS exchange_cycles (
  id SERIAL PRIMARY KEY,
  cycle_data JSONB NOT NULL,
  cycle_length INTEGER NOT NULL CHECK (cycle_length >= 2 AND cycle_length <= 5),
  match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','pending','accepted','active','completed','expired','rejected','cancelled')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exchange_cycles_status ON exchange_cycles(status);
CREATE INDEX IF NOT EXISTS idx_exchange_cycles_length ON exchange_cycles(cycle_length);
CREATE INDEX IF NOT EXISTS idx_exchange_cycles_created_at ON exchange_cycles(created_at);
