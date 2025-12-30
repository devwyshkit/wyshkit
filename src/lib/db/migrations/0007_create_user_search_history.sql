-- Create user_search_history table for storing user search history in Supabase
-- Swiggy Dec 2025 pattern: Search history syncs across devices

CREATE TABLE IF NOT EXISTS public.user_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  search_term text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own search history
CREATE POLICY "Users can read their own search history"
  ON public.user_search_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own search history
CREATE POLICY "Users can insert their own search history"
  ON public.user_search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own search history
CREATE POLICY "Users can delete their own search history"
  ON public.user_search_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS user_search_history_user_id_idx ON public.user_search_history(user_id);
CREATE INDEX IF NOT EXISTS user_search_history_user_id_created_at_idx ON public.user_search_history(user_id, created_at DESC);





