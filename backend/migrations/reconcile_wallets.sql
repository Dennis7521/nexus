-- Reconcile each user's ledger with their current wallet.
--
-- Background: users.time_credits was originally DEFAULT 10.00, so every
-- new account silently received 10 credits at INSERT time. The auth
-- verify-email route then added a further welcome_bonus of +10 that WAS
-- written to the transactions ledger. As a result, for pre-existing
-- users: (signed sum of ledger) != (current wallet). Additional drift
-- may exist from other legacy code paths.
--
-- This migration:
--   1) Removes the silent DEFAULT so future users only have ledgered
--      welcome_bonus credits.
--   2) Inserts a single "system_adjustment" transaction per affected
--      user, dated NOW, equal to (wallet - signed_ledger_sum). The row
--      appears at the top of Transaction History, labeled clearly, so
--      running-balance math reconciles and welcome_bonus remains the
--      earliest row (0 -> 10).
--
-- Idempotent: running again finds no gap and inserts nothing.

-- 1) Drop the silent default so registration only credits via ledger
ALTER TABLE users
ALTER COLUMN time_credits DROP DEFAULT;

-- 2) Insert reconciliation rows
INSERT INTO transactions
  (from_user_id, to_user_id, credits, transaction_type, description, created_at)
SELECT
  CASE WHEN gap < 0 THEN u.id ELSE NULL END,
  CASE WHEN gap > 0 THEN u.id ELSE NULL END,
  ABS(gap)::NUMERIC,
  'system_adjustment',
  'Ledger reconciliation — historical wallet activity not previously tracked',
  NOW()
FROM (
  SELECT
    u.id,
    (u.time_credits - COALESCE((
      SELECT SUM(
        CASE
          WHEN t.to_user_id = u.id THEN t.credits
          WHEN t.from_user_id = u.id THEN -t.credits
          ELSE 0
        END
      )
      FROM transactions t
      WHERE t.to_user_id = u.id OR t.from_user_id = u.id
    ), 0))::NUMERIC AS gap
  FROM users u
) gaps
JOIN users u ON u.id = gaps.id
WHERE gap <> 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions t2
    WHERE t2.transaction_type = 'system_adjustment'
      AND (t2.from_user_id = u.id OR t2.to_user_id = u.id)
  );
