-- Migration: Create skill_matches table for async matching (Mode A)
-- This table stores suggested matches between learners and teachers

CREATE TABLE IF NOT EXISTS skill_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name VARCHAR(255) NOT NULL,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  status VARCHAR(50) NOT NULL DEFAULT 'suggested',
  -- Status: suggested, contacted, accepted, rejected, expired
  
  -- Scoring breakdown (for transparency)
  rating_score DECIMAL(5,2),
  availability_score DECIMAL(5,2),
  location_score DECIMAL(5,2),
  activity_score DECIMAL(5,2),
  
  -- Metadata
  contacted_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT different_users CHECK (learner_id != teacher_id),
  CONSTRAINT valid_status CHECK (status IN ('suggested', 'contacted', 'accepted', 'rejected', 'expired'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_matches_learner ON skill_matches(learner_id);
CREATE INDEX IF NOT EXISTS idx_skill_matches_teacher ON skill_matches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_skill_matches_skill ON skill_matches(skill_name);
CREATE INDEX IF NOT EXISTS idx_skill_matches_status ON skill_matches(status);
CREATE INDEX IF NOT EXISTS idx_skill_matches_score ON skill_matches(match_score DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_skill_matches_learner_status ON skill_matches(learner_id, status);
CREATE INDEX IF NOT EXISTS idx_skill_matches_learner_skill ON skill_matches(learner_id, skill_name);

-- Prevent duplicate matches
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_match ON skill_matches(learner_id, teacher_id, skill_name) 
WHERE status NOT IN ('rejected', 'expired');

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_skill_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_skill_matches_updated_at
BEFORE UPDATE ON skill_matches
FOR EACH ROW
EXECUTE FUNCTION update_skill_matches_updated_at();

-- Comments
COMMENT ON TABLE skill_matches IS 'Stores suggested 1-to-1 skill exchange matches (Mode A)';
COMMENT ON COLUMN skill_matches.match_score IS 'Overall match quality score (0-100)';
COMMENT ON COLUMN skill_matches.status IS 'Current state of the match suggestion';
COMMENT ON COLUMN skill_matches.expires_at IS 'When this match suggestion expires';
