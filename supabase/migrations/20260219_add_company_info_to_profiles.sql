-- Add Company Info fields to Profiles for professional document generation
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_trn TEXT,
ADD COLUMN IF NOT EXISTS bank_details TEXT;

-- Enable RLS (Should already be enabled, but for safety)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Ensure users can only update their own profile (Standard)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
