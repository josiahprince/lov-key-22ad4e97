-- Drop the overly permissive INSERT policy that allows any authenticated user to create matches
-- The generate_daily_matches() SECURITY DEFINER function bypasses RLS, so no INSERT policy is needed
DROP POLICY IF EXISTS "System can create matches" ON public.matches;