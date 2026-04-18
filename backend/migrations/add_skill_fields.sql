-- Migration: Add missing fields to skills table
-- This adds prerequisites, tags, difficulty_level, location_type, skill_type, 
-- time_commitment fields, and other missing columns

-- Add skill_type column (offer/request)
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS skill_type VARCHAR(10) DEFAULT 'offer' CHECK (skill_type IN ('offer', 'request'));

-- Add difficulty_level column
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));

-- Add time commitment fields
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS time_commitment_hours INTEGER CHECK (time_commitment_hours > 0);

ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS time_commitment_period VARCHAR(20) CHECK (time_commitment_period IN ('week', 'month', 'total'));

-- Add location fields
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) CHECK (location_type IN ('online', 'on_campus', 'flexible'));

ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS specific_location VARCHAR(200);

-- Add prerequisites field
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS prerequisites TEXT;

-- Add tags array field
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add max_students field
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 1 CHECK (max_students > 0);

-- Add current_students field
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS current_students INTEGER DEFAULT 0 CHECK (current_students >= 0);

-- Add category_id field (for new schema compatibility)
ALTER TABLE skills 
ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- Update existing records with default values
UPDATE skills 
SET 
  skill_type = 'offer',
  difficulty_level = 'intermediate',
  location_type = 'online',
  max_students = 1,
  current_students = 0
WHERE skill_type IS NULL;

-- Parse duration_per_week to populate time_commitment fields
-- Example: "2 hrs/week" -> time_commitment_hours=2, time_commitment_period='week'
UPDATE skills
SET 
  time_commitment_hours = CAST(SUBSTRING(duration_per_week FROM '(\d+)') AS INTEGER),
  time_commitment_period = CASE 
    WHEN duration_per_week LIKE '%/week%' THEN 'week'
    WHEN duration_per_week LIKE '%/month%' THEN 'month'
    ELSE 'week'
  END
WHERE time_commitment_hours IS NULL AND duration_per_week IS NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_skills_skill_type ON skills(skill_type);
CREATE INDEX IF NOT EXISTS idx_skills_difficulty ON skills(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_skills_location_type ON skills(location_type);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING GIN(tags);

-- Add comment
COMMENT ON TABLE skills IS 'Updated schema with additional fields for skill management';
