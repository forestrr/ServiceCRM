-- FINAL DATA ASSIGNMENT & SCHEMA FIX
-- This script is strictly IDEMPOTENT and safe. 
-- Replace the UUID below with yours: ae5624b0-9a2b-49cb-b6ae-f9e56dc99ba4

DO $$ 
DECLARE 
    target_user_id UUID := 'ae5624b0-9a2b-49cb-b6ae-f9e56dc99ba4';
BEGIN
    -- 1. Ensure user_id exists where needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='user_id') THEN
        ALTER TABLE staff ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='user_id') THEN
        ALTER TABLE accounts ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- 2. Update Ownership (Targeting only tables that have user_id)
    -- This handles the "Column missing" error by checking if column exists before updating.
    
    -- Staff
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='user_id') THEN
        UPDATE staff SET user_id = target_user_id WHERE user_id IS NULL;
    END IF;

    -- Customers
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='user_id') THEN
        UPDATE customers SET user_id = target_user_id WHERE user_id IS NULL;
    END IF;

    -- Service Templates
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_templates' AND column_name='user_id') THEN
        UPDATE service_templates SET user_id = target_user_id WHERE user_id IS NULL;
    END IF;

    -- Applications
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='user_id') THEN
        UPDATE applications SET user_id = target_user_id WHERE user_id IS NULL;
    END IF;

    -- Accounts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='user_id') THEN
        UPDATE accounts SET user_id = target_user_id WHERE user_id IS NULL;
    END IF;

    -- Service Providers (Optional check)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_providers' AND column_name='user_id') THEN
        UPDATE service_providers SET user_id = target_user_id WHERE user_id IS NULL;
    END IF;

    -- Transactions (Use created_by if user_id is missing, or just skip if handled by Account RLS)
    -- The previous error showed Transactions doesn't have user_id. 
    -- We don't need to force it here as RLS on Transactions works via Account connection.
    -- But we can update created_by if we want.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='created_by') THEN
        UPDATE transactions SET created_by = target_user_id WHERE created_by IS NULL;
    END IF;

END $$;
