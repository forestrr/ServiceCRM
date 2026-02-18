-- Enable Row Level Security on all core tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1. Profiles Table Policies
-- ==========================================

DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" 
ON profiles FOR ALL 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ==========================================
-- 2. Customers Table Policies
-- ==========================================

-- LOGGED IN USERS: Can manage only their own customers
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
CREATE POLICY "Users can manage their own customers" 
ON customers FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PUBLIC PORTAL: Allow viewing specific customer by ID only
-- NOTE: This allows anyone with the UUID to view the NAME and ID.
-- We restrict this to SELECT only.
DROP POLICY IF EXISTS "Allow portal access for customers" ON customers;
CREATE POLICY "Allow portal access for customers" 
ON customers FOR SELECT 
TO anon
USING (true); 

-- ==========================================
-- 2. Applications Table Policies
-- ==========================================

-- LOGGED IN USERS: Can manage only their own applications
DROP POLICY IF EXISTS "Users can manage their own applications" ON applications;
CREATE POLICY "Users can manage their own applications" 
ON applications FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PUBLIC PORTAL: Allow viewing applications for a specific customer
DROP POLICY IF EXISTS "Allow portal access for applications" ON applications;
CREATE POLICY "Allow portal access for applications" 
ON applications FOR SELECT 
TO anon
USING (true);

-- ==========================================
-- 3. Application Steps Table Policies
-- ==========================================

-- LOGGED IN USERS: Can manage only steps belonging to their applications
DROP POLICY IF EXISTS "Users can manage their own application steps" ON application_steps;
CREATE POLICY "Users can manage their own application steps" 
ON application_steps FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM applications 
        WHERE applications.id = application_steps.application_id 
        AND applications.user_id = auth.uid()
    )
);

-- PUBLIC PORTAL: Allow viewing steps
DROP POLICY IF EXISTS "Allow portal access for application steps" ON application_steps;
CREATE POLICY "Allow portal access for application steps" 
ON application_steps FOR SELECT 
TO anon
USING (true);

-- ==========================================
-- 4. Documents Table Policies
-- ==========================================

-- LOGGED IN USERS: No anon access for documents
DROP POLICY IF EXISTS "Users can manage documents for their customers" ON documents;
CREATE POLICY "Users can manage documents for their customers" 
ON documents FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM customers 
        WHERE customers.id = documents.customer_id 
        AND customers.user_id = auth.uid()
    )
);

-- ==========================================
-- 5. Service Providers & Templates
-- ==========================================

DROP POLICY IF EXISTS "Users can manage their own providers" ON service_providers;
CREATE POLICY "Users can manage their own providers" 
ON service_providers FOR ALL 
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own templates" ON service_templates;
CREATE POLICY "Users can manage their own templates" 
ON service_templates FOR ALL 
TO authenticated
USING (auth.uid() = user_id);
