-- Create table to store suggested matches for asynchronous (credit-based) matching
CREATE TABLE IF NOT EXISTS skill_matches (
  id SERIAL PRIMARY KEY,
  learner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name VARCHAR(255) NOT NULL,
  match_score NUMERIC(5,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','contacted','accepted','completed','cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skill_matches_learner ON skill_matches(learner_id);
CREATE INDEX IF NOT EXISTS idx_skill_matches_teacher ON skill_matches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_skill_matches_status ON skill_matches(status);
CREATE INDEX IF NOT EXISTS idx_skill_matches_skill ON skill_matches(skill_name);
