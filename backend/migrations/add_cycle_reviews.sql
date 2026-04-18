-- Migration: add_cycle_reviews
-- Creates cycle_reviews table for sync exchange reviews
-- Reviews from completed exchange cycles (sync exchanges)
-- These are merged with exchange_reviews for unified display

CREATE TABLE IF NOT EXISTS cycle_reviews (
    id SERIAL PRIMARY KEY,
    cycle_id UUID NOT NULL REFERENCES exchange_cycles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_title VARCHAR(200),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cycle_id, reviewer_id, reviewee_id) -- One review per reviewer-reviewee pair per cycle
);

CREATE INDEX IF NOT EXISTS idx_cycle_reviews_reviewee ON cycle_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_cycle_reviews_cycle ON cycle_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_reviews_reviewer ON cycle_reviews(reviewer_id);

-- Function to recalculate and update a user's aggregate rating from ALL reviews (both types)
CREATE OR REPLACE FUNCTION update_user_rating_from_all_reviews()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_count INTEGER;
BEGIN
    -- Calculate average from both exchange_reviews and cycle_reviews
    SELECT 
        COALESCE(AVG(rating::DECIMAL), 0),
        COUNT(*)
    INTO avg_rating, total_count
    FROM (
        SELECT rating FROM exchange_reviews WHERE reviewee_id = NEW.reviewee_id
        UNION ALL
        SELECT rating FROM cycle_reviews WHERE reviewee_id = NEW.reviewee_id
    ) all_reviews;
    
    UPDATE users
    SET
        total_rating = avg_rating,
        rating_count = total_count
    WHERE id = NEW.reviewee_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for exchange_reviews (updates from async exchanges)
DROP TRIGGER IF EXISTS update_user_rating_on_exchange_review ON exchange_reviews;
CREATE TRIGGER update_user_rating_on_exchange_review
    AFTER INSERT OR UPDATE ON exchange_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating_from_all_reviews();

-- Trigger for cycle_reviews (updates from sync exchanges)
DROP TRIGGER IF EXISTS update_user_rating_on_cycle_review ON cycle_reviews;
CREATE TRIGGER update_user_rating_on_cycle_review
    AFTER INSERT OR UPDATE ON cycle_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating_from_all_reviews();
