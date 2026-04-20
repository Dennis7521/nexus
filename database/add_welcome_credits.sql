-- Add welcome credits to your account (202200358@ub.ac.bw)
-- This fixes the missing welcome deposit from registration

DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find the user
    SELECT id, time_credits INTO user_record 
    FROM users 
    WHERE email = '202200358@ub.ac.bw';
    
    IF user_record IS NULL THEN
        RAISE NOTICE 'User not found';
        RETURN;
    END IF;
    
    -- Check if welcome transaction already exists
    IF EXISTS (
        SELECT 1 FROM transactions 
        WHERE to_user_id = user_record.id 
        AND transaction_type = 'welcome_bonus'
    ) THEN
        RAISE NOTICE 'Welcome credits already added';
        RETURN;
    END IF;
    
    -- Add welcome transaction
    INSERT INTO transactions (
        from_user_id, 
        to_user_id, 
        credits, 
        transaction_type, 
        description, 
        exchange_request_id
    ) VALUES (
        NULL, 
        user_record.id, 
        10, 
        'welcome_bonus', 
        'Welcome deposit — Initial 10 credits', 
        NULL
    );
    
    -- Update user's time_credits
    UPDATE users 
    SET time_credits = COALESCE(time_credits, 0) + 10 
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Added 10 welcome credits to user %', user_record.id;
END $$;

-- Verify the update
SELECT email, time_credits FROM users WHERE email = '202200358@ub.ac.bw';
