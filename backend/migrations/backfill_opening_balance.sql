-- Backfill an "opening_balance" transaction for any user whose existing
-- ledger does not reconcile with their current wallet (time_credits).
--
-- Rationale: features like welcome_bonus / purchases / session_payment
-- were added to the transactions table at different points in the
-- project's history. Users that existed before those features were
-- tracked have a signed-credits sum that no longer matches their
-- current balance, which causes "Balance before: -X.XX" artifacts in
-- the Transaction History UI.
--
-- This migration inserts ONE reconciliation row per affected user at a
-- timestamp just before their earliest ledger entry (or their account
-- creation if no transactions exist yet). Running the migration twice
-- is safe: the second run will compute a shortfall of 0 and insert
-- nothing because of the WHERE clause.

INSERT INTO transactions
  (from_user_id, to_user_id, credits, transaction_type, description, created_at)
SELECT
  NULL,
  u.id,
  (u.time_credits - COALESCE(ledger.signed_sum, 0))::NUMERIC AS opening_credits,
  'opening_balance',
  'Opening balance (reconciled from account activity prior to ledger tracking)',
  COALESCE(ledger.earliest_at, u.created_at) - INTERVAL '1 second'
FROM users u
LEFT JOIN LATERAL (
  SELECT
    SUM(
      CASE
        WHEN t.to_user_id   = u.id THEN t.credits
        WHEN t.from_user_id = u.id THEN -t.credits
        ELSE 0
      END
    ) AS signed_sum,
    MIN(t.created_at) AS earliest_at
  FROM transactions t
  WHERE t.to_user_id = u.id OR t.from_user_id = u.id
) ledger ON TRUE
WHERE (u.time_credits - COALESCE(ledger.signed_sum, 0)) <> 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions t2
    WHERE t2.to_user_id = u.id
      AND t2.transaction_type = 'opening_balance'
  );
