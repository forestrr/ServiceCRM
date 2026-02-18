-- 1. Create the 'documents' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for 'documents' bucket

-- Allow Authenticated users to upload files to their own folders
-- Folder structure is assumed to be customer_id/filename
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' 
    -- We can further restrict this to ensure they only upload to paths they own if needed
);

-- Allow Authenticated users to read files
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow Authenticated users to delete files
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
