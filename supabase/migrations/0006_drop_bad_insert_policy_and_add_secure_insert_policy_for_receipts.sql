-- Ensure RLS is enabled
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Remove any faulty insert policy
DROP POLICY IF EXISTS "insert own receipts" ON public.receipts;

-- Create a proper insert policy: only allow inserting rows where auth.uid() = user_id
CREATE POLICY "insert own receipts" 
  ON public.receipts 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);