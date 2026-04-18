-- Migration to fix skills table column name
-- This renames instructor_id to user_id if it exists

-- Check if instructor_id exists and rename it to user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'skills' 
        AND column_name = 'instructor_id'
    ) THEN
        ALTER TABLE skills RENAME COLUMN instructor_id TO user_id;
        RAISE NOTICE 'Column instructor_id renamed to user_id';
    ELSE
        RAISE NOTICE 'Column instructor_id does not exist, no changes made';
    END IF;
END $$;

-- Verify the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'skills' 
        AND column_name = 'user_id'
    ) THEN
        RAISE EXCEPTION 'Column user_id does not exist in skills table. Please check your schema.';
    END IF;
END $$;
