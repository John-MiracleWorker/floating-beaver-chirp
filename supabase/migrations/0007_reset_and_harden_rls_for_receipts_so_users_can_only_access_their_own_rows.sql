-- Step 1: Drop all existing policies to ensure a clean slate
DROP POLICY IF EXISTS "select own receipts" ON public.receipts;
DROP POLICY IF EXISTS "insert own receipts" ON public.receipts;
DROP POLICY IF EXISTS "update own receipts" ON public.receipts;
DROP POLICY IF EXISTS "delete own receipts" ON public.receipts;

-- Step 2: Ensure RLS is enabled on the table
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Step 3: Re-create secure policies for all operations
-- Users can only see their own receipts
CREATE POLICY "select own receipts" ON public.receipts
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can only insert their own receipts
CREATE POLICY "insert own receipts" ON public.receipts
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can only update their own receipts
CREATE POLICY "update own receipts" ON public.receipts
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can only delete their own receipts
CREATE POLICY "delete own receipts" ON public.receipts
FOR DELETE TO authenticated USING (auth.uid() = user_id);