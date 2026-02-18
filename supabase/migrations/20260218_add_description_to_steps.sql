-- Add description column to application_steps
ALTER TABLE application_steps ADD COLUMN IF NOT EXISTS description TEXT;
