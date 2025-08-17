-- These policies apply to the STORAGE bucket named 'receipts'.
-- This allows users to manage files in a folder named after their user ID.

-- Clean up existing policies to prevent conflicts
DROP POLICY IF EXISTS "Receipts - Allow read access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Receipts - Allow insert access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Receipts - Allow update access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Receipts - Allow delete access to own folder" ON storage.objects;

-- 1. Allow users to view files in their own folder
CREATE POLICY "Receipts - Allow read access to own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- 2. Allow users to upload files into their own folder
CREATE POLICY "Receipts - Allow insert access to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- 3. Allow users to update files in their own folder
CREATE POLICY "Receipts - Allow update access to own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- 4. Allow users to delete files from their own folder
CREATE POLICY "Receipts - Allow delete access to own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid);