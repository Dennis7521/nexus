-- Skill-Specific Ratings Migration
-- Run this SQL to enable per-skill ratings

-- Add rating columns to skills table
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0);

-- Create index for efficient rating lookups
CREATE INDEX IF NOT EXISTS idx_skills_rating ON skills(user_id, rating_count) WHERE rating_count > 0;

-- Function to update skill-specific rating when a review is added
CREATE OR REPLACE FUNCTION update_skill_rating_from_review()
RETURNS TRIGGER AS $$
DECLARE
  skill_record RECORD;
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
  user_skill_avg DECIMAL(3,2);
  user_total_reviews INTEGER;
BEGIN
  -- Find the skill that matches this review (by instructor/user and skill_title)
  SELECT s.id, s.user_id INTO skill_record
  FROM skills s
  WHERE s.user_id = NEW.reviewee_id
    AND LOWER(TRIM(s.title)) = LOWER(TRIM(NEW.skill_title))
  LIMIT 1;

  -- If matching skill found, update its rating
  IF skill_record.id IS NOT NULL THEN
    -- Calculate average rating for this specific skill
    SELECT
      COALESCE(AVG(rating::DECIMAL), 0),
      COUNT(*)
    INTO avg_rating, review_count
    FROM (
      SELECT rating FROM exchange_reviews 
      WHERE reviewee_id = NEW.reviewee_id 
        AND LOWER(TRIM(skill_title)) = LOWER(TRIM(NEW.skill_title))
      UNION ALL
      SELECT rating FROM cycle_reviews 
      WHERE reviewee_id = NEW.reviewee_id 
        AND LOWER(TRIM(skill_title)) = LOWER(TRIM(NEW.skill_title))
    ) skill_reviews;

    -- Update the skill's rating
    UPDATE skills
    SET rating = avg_rating,
        rating_count = review_count
    WHERE id = skill_record.id;
  END IF;

  -- Recalculate user's overall rating as average of all their skill ratings
  SELECT
    COALESCE(AVG(rating), 0),
    COALESCE(SUM(rating_count), 0)
  INTO user_skill_avg, user_total_reviews
  FROM skills
  WHERE user_id = NEW.reviewee_id
    AND rating_count > 0;

  -- Update user's overall rating
  UPDATE users
  SET total_rating = user_skill_avg,
      rating_count = user_total_reviews
  WHERE id = NEW.reviewee_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if present to avoid conflicts
DROP TRIGGER IF EXISTS update_skill_rating_on_exchange_review ON exchange_reviews;
DROP TRIGGER IF EXISTS update_skill_rating_on_cycle_review ON cycle_reviews;

-- Create triggers for both review tables
CREATE TRIGGER update_skill_rating_on_exchange_review
  AFTER INSERT OR UPDATE ON exchange_reviews
  FOR EACH ROW EXECUTE FUNCTION update_skill_rating_from_review();

CREATE TRIGGER update_skill_rating_on_cycle_review
  AFTER INSERT OR UPDATE ON cycle_reviews
  FOR EACH ROW EXECUTE FUNCTION update_skill_rating_from_review();

-- Backfill skill ratings from existing reviews
WITH skill_ratings AS (
  SELECT 
    s.id as skill_id,
    s.user_id,
    COALESCE(AVG(all_reviews.rating::DECIMAL), 0) as avg_rating,
    COUNT(all_reviews.rating) as review_count
  FROM skills s
  LEFT JOIN (
    SELECT reviewee_id, skill_title, rating FROM exchange_reviews
    UNION ALL
    SELECT reviewee_id, skill_title, rating FROM cycle_reviews
  ) all_reviews 
    ON s.user_id = all_reviews.reviewee_id 
    AND LOWER(TRIM(s.title)) = LOWER(TRIM(all_reviews.skill_title))
  WHERE all_reviews.rating IS NOT NULL
  GROUP BY s.id, s.user_id
)
UPDATE skills s
SET rating = sr.avg_rating,
    rating_count = sr.review_count
FROM skill_ratings sr
WHERE s.id = sr.skill_id;

-- Backfill user ratings from skill ratings
WITH user_skill_avgs AS (
  SELECT 
    user_id,
    COALESCE(AVG(rating), 0) as avg_rating,
    COALESCE(SUM(rating_count), 0) as total_count
  FROM skills
  WHERE rating_count > 0
  GROUP BY user_id
)
UPDATE users u
SET total_rating = usa.avg_rating,
    rating_count = usa.total_count
FROM user_skill_avgs usa
WHERE u.id = usa.user_id
  AND (u.total_rating IS DISTINCT FROM usa.avg_rating
       OR u.rating_count IS DISTINCT FROM usa.total_count);
