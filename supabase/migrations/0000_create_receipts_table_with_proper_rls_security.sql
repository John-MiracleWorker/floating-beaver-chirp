-- Create receipts table
CREATE TABLE public.receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "select own receipts" ON public.receipts 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own receipts" ON public.receipts 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own receipts" ON public.receipts 
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update own receipts" ON public.receipts 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);