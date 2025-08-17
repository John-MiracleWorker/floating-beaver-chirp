-- Ensure RLS is enabled
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Replace the insert policy with a secure one
DROP POLICY IF EXISTS "insert own receipts" ON public.receipts;

CREATE POLICY "insert own receipts" ON public.receipts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);