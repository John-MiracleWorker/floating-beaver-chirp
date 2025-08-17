-- These policies use a more reliable method to check for folder ownership.

-- Clean up existing policies to prevent conflicts
DROP POLICY IF EXISTS "Receipts - Allow read access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Receipts - Allow insert access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Receipts - Allow update access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Receipts - Allow delete access to own folder" ON storage.objects;

-- 1. Allow users to view files in their own folder (and subfolders)
CREATE POLICY "Receipts - Allow read access to own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts' AND name LIKE auth.uid()::text || '/%');

-- 2. Allow users to upload files into their own folder (and subfolders)
CREATE POLICY "Receipts - Allow insert access to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts' AND name LIKE auth.uid()::text || '/%');

-- 3. Allow users to update files in their own folder (and subfolders)
CREATE POLICY "Receipts - Allow update access to own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts' AND name LIKE auth.uid()::text || '/%');

-- 4. Allow users to delete files from their own folder (and subfolders)
CREATE POLICY "Receipts - Allow delete access to own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts' AND name LIKE auth.uid()::text || '/%');