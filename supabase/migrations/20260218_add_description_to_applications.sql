-- Add description column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS description TEXT;
