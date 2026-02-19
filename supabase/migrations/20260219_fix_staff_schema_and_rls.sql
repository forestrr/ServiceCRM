-- COMPREHENSIVE FIX: Secures ALL ERP Data & Fixes Staff Schema
-- This script is IDEMPOTENT (safe to run multiple times).

-- 1. Upgrade Staff Table for "Agency Mode"
-- Add user_id column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='user_id') THEN
        ALTER TABLE staff ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

-- Change id default
ALTER TABLE staff ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Upgrade Accounts Table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='user_id') THEN
        ALTER TABLE accounts ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;


-- 3. LOCK DOWN ALL DATA (Strict Row Level Security)
-- Explicitly drop policies before creating them to avoid "policy already exists" errors.

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access" ON customers;
DROP POLICY IF EXISTS "Users can only see their own customers" ON customers;
CREATE POLICY "Users can only see their own customers" ON customers FOR ALL TO authenticated USING (user_id = auth.uid());

-- Service Templates
ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access" ON service_templates;
DROP POLICY IF EXISTS "Users can only see their own templates" ON service_templates;
CREATE POLICY "Users can only see their own templates" ON service_templates FOR ALL TO authenticated USING (user_id = auth.uid());

-- Staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON staff;
DROP POLICY IF EXISTS "Users can manage their staff" ON staff;
CREATE POLICY "Users can manage their staff" ON staff FOR ALL TO authenticated USING (user_id = auth.uid());

-- Accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON accounts;
DROP POLICY IF EXISTS "Users can manage own accounts" ON accounts;
CREATE POLICY "Users can manage own accounts" ON accounts FOR ALL TO authenticated USING (user_id = auth.uid());

-- Applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only see their own applications" ON applications;
CREATE POLICY "Users can only see their own applications" ON applications FOR ALL TO authenticated USING (user_id = auth.uid());

-- Invoices (Linked via Application)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON invoices; 
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;
CREATE POLICY "Users can manage own invoices" ON invoices FOR ALL TO authenticated 
USING (application_id IN (SELECT id FROM applications WHERE user_id = auth.uid()));

-- Quotations (Linked via Customer)
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON quotations;
DROP POLICY IF EXISTS "Users can manage own quotations" ON quotations;
CREATE POLICY "Users can manage own quotations" ON quotations FOR ALL TO authenticated 
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Transactions (Linked via Account)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON transactions;
DROP POLICY IF EXISTS "Users can manage transactions via account" ON transactions;
CREATE POLICY "Users can manage transactions via account" ON transactions FOR ALL TO authenticated 
USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));

-- Step Logs (Linked via Application)
ALTER TABLE step_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON step_logs;
DROP POLICY IF EXISTS "Users can manage step logs via application" ON step_logs;
CREATE POLICY "Users can manage step logs via application" ON step_logs FOR ALL TO authenticated 
USING (application_id IN (SELECT id FROM applications WHERE user_id = auth.uid()));

-- Provider Ledger (Linked via Application)
ALTER TABLE provider_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON provider_ledger;
DROP POLICY IF EXISTS "Users can manage provider ledger via application" ON provider_ledger;
CREATE POLICY "Users can manage provider ledger via application" ON provider_ledger FOR ALL TO authenticated 
USING (application_id IN (SELECT id FROM applications WHERE user_id = auth.uid()));
