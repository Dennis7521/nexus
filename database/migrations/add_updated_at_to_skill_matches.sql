-- Add updated_at column to skill_matches table
ALTER TABLE skill_matches 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_skill_matches_updated_at()
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
    WHERE t.tgname = 'skill_matches_updated_at'
      AND c.relname = 'skill_matches'
  ) THEN
    CREATE TRIGGER skill_matches_updated_at
      BEFORE UPDATE ON skill_matches
      FOR EACH ROW
      EXECUTE FUNCTION update_skill_matches_updated_at();
  END IF;
END;
$$;
