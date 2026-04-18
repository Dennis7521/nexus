-- Normalize credit-ledger semantics so each user's signed deltas equal
-- their actual wallet change.
--
-- Before: escrow rows recorded from=learner, to=instructor (misleading
-- because the instructor's wallet is not credited until a later
-- session_payment). Likewise session_payment/refund carried a from_user_id
-- that had already been debited at escrow time.
--
-- After: escrow sits in a system account (NULL). Releases (session_payment,
-- refund) credit out of that system account to the recipient.
--
-- This migration is idempotent.

UPDATE transactions
SET to_user_id = NULL
WHERE transaction_type = 'escrow' AND to_user_id IS NOT NULL;

UPDATE transactions
SET from_user_id = NULL
WHERE transaction_type IN ('session_payment', 'refund') AND from_user_id IS NOT NULL;
