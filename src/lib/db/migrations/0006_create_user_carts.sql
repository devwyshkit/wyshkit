-- Create user_carts table for storing user carts in Supabase
-- Swiggy Dec 2025 pattern: Cart syncs across devices, survives browser clear

CREATE TABLE IF NOT EXISTS public.user_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of cart items
  vendor_id uuid REFERENCES public.vendors(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_carts_user_id_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own cart
CREATE POLICY "Users can read their own cart"
  ON public.user_carts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own cart
CREATE POLICY "Users can insert their own cart"
  ON public.user_carts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart
CREATE POLICY "Users can update their own cart"
  ON public.user_carts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own cart
CREATE POLICY "Users can delete their own cart"
  ON public.user_carts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS user_carts_user_id_idx ON public.user_carts(user_id);





