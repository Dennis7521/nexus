-- Migration: Create matching_preferences table
-- This table stores user preferences for matching algorithm behavior

CREATE TABLE IF NOT EXISTS matching_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Mode preferences
  prefer_async BOOLEAN DEFAULT TRUE,
  prefer_sync BOOLEAN DEFAULT TRUE,
  
  -- Matching thresholds
  min_match_score INTEGER DEFAULT 50 CHECK (min_match_score >= 0 AND min_match_score <= 100),
  max_cycle_length INTEGER DEFAULT 3 CHECK (max_cycle_length >= 2 AND max_cycle_length <= 5),
  
  -- Automation preferences
  auto_suggest BOOLEAN DEFAULT TRUE,
  receive_cycle_notifications BOOLEAN DEFAULT TRUE,
  
  -- Availability preferences
  preferred_days TEXT[], -- e.g., ['monday', 'wednesday', 'friday']
  preferred_times TEXT[], -- e.g., ['morning', 'afternoon', 'evening']
  
  -- Location preferences
  max_distance_km INTEGER, -- NULL means no preference
  prefer_online BOOLEAN DEFAULT TRUE,
  prefer_in_person BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_matching_preferences_user ON matching_preferences(user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_matching_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_matching_preferences_updated_at
BEFORE UPDATE ON matching_preferences
FOR EACH ROW
EXECUTE FUNCTION update_matching_preferences_updated_at();

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_matching_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO matching_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create preferences when user is created
CREATE TRIGGER trigger_create_default_preferences
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_matching_preferences();

-- Comments
COMMENT ON TABLE matching_preferences IS 'User preferences for matching algorithm behavior';
COMMENT ON COLUMN matching_preferences.prefer_async IS 'Prefer 1-to-1 credit-based matching (Mode A)';
COMMENT ON COLUMN matching_preferences.prefer_sync IS 'Prefer multi-party cycle matching (Mode B)';
COMMENT ON COLUMN matching_preferences.min_match_score IS 'Minimum acceptable match quality score (0-100)';
COMMENT ON COLUMN matching_preferences.max_cycle_length IS 'Maximum number of participants in a cycle (2-5)';
COMMENT ON COLUMN matching_preferences.auto_suggest IS 'Automatically generate match suggestions';
