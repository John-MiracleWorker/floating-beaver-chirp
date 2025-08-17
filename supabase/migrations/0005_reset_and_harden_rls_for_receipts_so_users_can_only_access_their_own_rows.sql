-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "insert own receipts" ON public.receipts;
DROP POLICY IF EXISTS "select own receipts" ON public.receipts;
DROP POLICY IF EXISTS "update own receipts" ON public.receipts;
DROP POLICY IF EXISTS "delete own receipts" ON public.receipts;

-- Recreate secure policies for each operation
CREATE POLICY "select own receipts" ON public.receipts
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "insert own receipts" ON public.receipts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own receipts" ON public.receipts
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "delete own receipts" ON public.receipts
FOR DELETE TO authenticated
USING (auth.uid() = user_id);