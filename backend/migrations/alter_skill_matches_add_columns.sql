-- Migration: Add missing columns to skill_matches table if they don't exist

-- Add expires_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='skill_matches' AND column_name='expires_at') THEN
    ALTER TABLE skill_matches ADD COLUMN expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days');
  END IF;
END $$;

-- Add scoring breakdown columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='skill_matches' AND column_name='rating_score') THEN
    ALTER TABLE skill_matches ADD COLUMN rating_score DECIMAL(5,2);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='skill_matches' AND column_name='availability_score') THEN
    ALTER TABLE skill_matches ADD COLUMN availability_score DECIMAL(5,2);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='skill_matches' AND column_name='location_score') THEN
    ALTER TABLE skill_matches ADD COLUMN location_score DECIMAL(5,2);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='skill_matches' AND column_name='activity_score') THEN
    ALTER TABLE skill_matches ADD COLUMN activity_score DECIMAL(5,2);
  END IF;
END $$;

-- Add timestamp columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='skill_matches' AND column_name='contacted_at') THEN
    ALTER TABLE skill_matches ADD COLUMN contacted_at TIMESTAMP;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='skill_matches' AND column_name='accepted_at') THEN
    ALTER TABLE skill_matches ADD COLUMN accepted_at TIMESTAMP;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='skill_matches' AND column_name='rejected_at') THEN
    ALTER TABLE skill_matches ADD COLUMN rejected_at TIMESTAMP;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_skill_matches_expires ON skill_matches(expires_at);
