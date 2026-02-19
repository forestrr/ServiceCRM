-- SECURITY FIX: Enable RLS and strict policies for all core tables

-- 1. Customers
-- Ensure RLS is enabled
DO $$ BEGIN EXECUTE 'ALTER TABLE customers ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Drop generic policies if they exist (to be safe)
DROP POLICY IF EXISTS "Public access" ON customers;
DROP POLICY IF EXISTS "Authenticated access" ON customers;

-- Create strict user_id policy
-- Assuming customers table has user_id column
DROP POLICY IF EXISTS "Users can only see their own customers" ON customers;
CREATE POLICY "Users can only see their own customers" ON customers
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());


-- 2. Service Templates
DO $$ BEGIN EXECUTE 'ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "Public access" ON service_templates;
DROP POLICY IF EXISTS "Authenticated access" ON service_templates;

DROP POLICY IF EXISTS "Users can only see their own templates" ON service_templates;
CREATE POLICY "Users can only see their own templates" ON service_templates
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());


-- 3. Service Providers
DO $$ BEGIN EXECUTE 'ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can only see their own providers" ON service_providers;
CREATE POLICY "Users can only see their own providers" ON service_providers
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());


-- 4. Applications (Workflows)
DO $$ BEGIN EXECUTE 'ALTER TABLE applications ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can only see their own applications" ON applications;
CREATE POLICY "Users can only see their own applications" ON applications
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());


-- 5. Invoices
-- Invoices are linked to applications, which are linked to user_id.
-- Also linked to customers, which are linked to user_id.
DO $$ BEGIN EXECUTE 'ALTER TABLE invoices ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "Admin full access" ON invoices; 

DROP POLICY IF EXISTS "Users can manage own invoices via application" ON invoices;
CREATE POLICY "Users can manage own invoices via application" ON invoices
    FOR ALL
    TO authenticated
    USING (
        application_id IN (
            SELECT id FROM applications WHERE user_id = auth.uid()
        )
    );


-- 6. Quotations
DO $$ BEGIN EXECUTE 'ALTER TABLE quotations ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "Admin full access" ON quotations; 

DROP POLICY IF EXISTS "Users can manage own quotations via customer" ON quotations;
CREATE POLICY "Users can manage own quotations via customer" ON quotations
    FOR ALL
    TO authenticated
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    );


-- 7. Staff & Profiles
-- Staff must be owned by the user. If staff table uses id as user_id, then:
DO $$ BEGIN EXECUTE 'ALTER TABLE staff ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "Admin full access" ON staff;

DROP POLICY IF EXISTS "Users can manage own staff profile" ON staff;
CREATE POLICY "Users can manage own staff profile" ON staff
    FOR ALL
    TO authenticated
    USING (id = auth.uid());


-- 8. Accounts & Financials
-- Need to ensure accounts are user-scoped. 
-- Adding user_id column if missing.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

DO $$ BEGIN EXECUTE 'ALTER TABLE accounts ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "Admin full access" ON accounts;

DROP POLICY IF EXISTS "Users can manage own accounts" ON accounts;
CREATE POLICY "Users can manage own accounts" ON accounts
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());


-- 9. Step Logs
-- Linked via Application
DO $$ BEGIN EXECUTE 'ALTER TABLE step_logs ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "Admin full access" ON step_logs;

DROP POLICY IF EXISTS "Users can manage step logs via application" ON step_logs
    FOR ALL
    TO authenticated
    USING (
        application_id IN (
            SELECT id FROM applications WHERE user_id = auth.uid()
        )
    );
