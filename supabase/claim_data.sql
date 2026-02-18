-- STEP 1: Find your User ID
-- Run this first to see your ID, then copy it into the variable below
-- SELECT id, email FROM auth.users;

-- STEP 2: Assign existing data to your user
-- Replace 'YOUR_USER_ID_HERE' with the ID you found in Step 1
DO $$ 
DECLARE 
    target_user_id UUID := 'YOUR_USER_ID_HERE'; -- <--- PASTE YOUR ID HERE
BEGIN
    -- Update customers
    UPDATE customers SET user_id = target_user_id WHERE user_id IS NULL;
    
    -- Update applications
    UPDATE applications SET user_id = target_user_id WHERE user_id IS NULL;
    
    -- Update service providers
    UPDATE service_providers SET user_id = target_user_id WHERE user_id IS NULL;
    
    -- Update service templates
    UPDATE service_templates SET user_id = target_user_id WHERE user_id IS NULL;

    RAISE NOTICE 'Existing data has been claimed by user %', target_user_id;
END $$;
