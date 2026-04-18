-- Create exchange_requests table for managing skill exchange requests
CREATE TABLE IF NOT EXISTS exchange_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_exchange_requests_requester ON exchange_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_instructor ON exchange_requests(instructor_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_skill ON exchange_requests(skill_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_status ON exchange_requests(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_exchange_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'exchange_requests_updated_at'
      AND c.relname = 'exchange_requests'
  ) THEN
    CREATE TRIGGER exchange_requests_updated_at
      BEFORE UPDATE ON exchange_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_exchange_requests_updated_at();
  END IF;
END;
$$;
