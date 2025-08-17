-- Ensure RLS is enabled
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "select own receipts" ON public.receipts;
CREATE POLICY "select own receipts"
  ON public.receipts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert policy
DROP POLICY IF EXISTS "insert own receipts" ON public.receipts;
CREATE POLICY "insert own receipts"
  ON public.receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update policy
DROP POLICY IF EXISTS "update own receipts" ON public.receipts;
CREATE POLICY "update own receipts"
  ON public.receipts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Delete policy
DROP POLICY IF EXISTS "delete own receipts" ON public.receipts;
CREATE POLICY "delete own receipts"
  ON public.receipts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);