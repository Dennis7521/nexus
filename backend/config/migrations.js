const { query } = require('./database');

// Idempotent migrations applied on server startup.
// Each entry must be safe to run repeatedly (use IF NOT EXISTS / IF EXISTS).
const migrations = [
  {
    name: 'add_meeting_ended_to_sync_exchange_sessions',
    sql: `
      ALTER TABLE sync_exchange_sessions
        ADD COLUMN IF NOT EXISTS meeting_ended BOOLEAN NOT NULL DEFAULT FALSE;
      UPDATE sync_exchange_sessions
        SET meeting_ended = TRUE
        WHERE status = 'completed' AND meeting_ended = FALSE;
    `,
  },
  {
    // Ensure ratings reflect both async exchange_reviews and sync cycle_reviews.
    // Re-creates the unified rating trigger and backfills users.total_rating /
    // rating_count from all existing reviews.
    name: 'unified_user_rating_trigger_and_backfill',
    sql: `
      CREATE OR REPLACE FUNCTION update_user_rating_from_all_reviews()
      RETURNS TRIGGER AS $$
      DECLARE
          avg_rating DECIMAL(3,2);
          total_count INTEGER;
      BEGIN
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
          SET total_rating = avg_rating, rating_count = total_count
          WHERE id = NEW.reviewee_id;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_user_rating_on_exchange_review ON exchange_reviews;
      CREATE TRIGGER update_user_rating_on_exchange_review
          AFTER INSERT OR UPDATE ON exchange_reviews
          FOR EACH ROW EXECUTE FUNCTION update_user_rating_from_all_reviews();

      DROP TRIGGER IF EXISTS update_user_rating_on_cycle_review ON cycle_reviews;
      CREATE TRIGGER update_user_rating_on_cycle_review
          AFTER INSERT OR UPDATE ON cycle_reviews
          FOR EACH ROW EXECUTE FUNCTION update_user_rating_from_all_reviews();

      -- Backfill ratings for any users whose totals are stale
      WITH agg AS (
        SELECT reviewee_id, AVG(rating::DECIMAL) AS avg_rating, COUNT(*) AS total_count
        FROM (
          SELECT reviewee_id, rating FROM exchange_reviews
          UNION ALL
          SELECT reviewee_id, rating FROM cycle_reviews
        ) r
        GROUP BY reviewee_id
      )
      UPDATE users u
      SET total_rating = agg.avg_rating, rating_count = agg.total_count
      FROM agg
      WHERE u.id = agg.reviewee_id
        AND (u.total_rating IS DISTINCT FROM agg.avg_rating
             OR u.rating_count IS DISTINCT FROM agg.total_count);
    `,
  },
];

async function runStartupMigrations() {
  for (const m of migrations) {
    try {
      await query(m.sql);
      console.log(`✓ migration applied: ${m.name}`);
    } catch (err) {
      console.error(`✗ migration failed: ${m.name}:`, err.message);
    }
  }
}

module.exports = { runStartupMigrations };
