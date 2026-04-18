-- Migration: add_exchange_reviews
-- Creates exchange_reviews table for post-exchange instructor reviews
-- One review per completed exchange (by the learner, about the instructor)

CREATE TABLE IF NOT EXISTS exchange_reviews (
    id SERIAL PRIMARY KEY,
    exchange_request_id INTEGER NOT NULL REFERENCES exchange_requests(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_title VARCHAR(200),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exchange_request_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_exchange_reviews_reviewee ON exchange_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_exchange_reviews_exchange ON exchange_reviews(exchange_request_id);

-- Function to recalculate and update a user's aggregate rating
CREATE OR REPLACE FUNCTION update_user_rating_from_exchange_reviews()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        total_rating = (
            SELECT COALESCE(AVG(rating::DECIMAL), 0)
            FROM exchange_reviews
            WHERE reviewee_id = NEW.reviewee_id
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM exchange_reviews
            WHERE reviewee_id = NEW.reviewee_id
        )
    WHERE id = NEW.reviewee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_rating_on_exchange_review ON exchange_reviews;
CREATE TRIGGER update_user_rating_on_exchange_review
    AFTER INSERT OR UPDATE ON exchange_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating_from_exchange_reviews();
