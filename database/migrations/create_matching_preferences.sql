-- Per-user matching preferences
CREATE TABLE IF NOT EXISTS matching_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefer_async BOOLEAN DEFAULT TRUE,
  prefer_sync BOOLEAN DEFAULT TRUE,
  max_cycle_length INTEGER DEFAULT 3 CHECK (max_cycle_length >= 2 AND max_cycle_length <= 5),
  min_match_score NUMERIC(5,2) DEFAULT 50.0 CHECK (min_match_score >= 0 AND min_match_score <= 100),
  auto_suggest BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matching_preferences_min_score ON matching_preferences(min_match_score);
