-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "insert own receipts" ON public.receipts;

-- Recreate policy to allow users to insert their own receipts
CREATE POLICY "insert own receipts"
  ON public.receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);