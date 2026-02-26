
-- 1. Matches: No client-side INSERT allowed (matches are created by SECURITY DEFINER function)
-- This explicit deny prevents any client from creating matches directly
CREATE POLICY "No direct match creation by users"
ON public.matches
FOR INSERT
WITH CHECK (false);

-- 2. Matches: Allow users to delete their own matches (unmatch/block)
CREATE POLICY "Users can delete their own matches"
ON public.matches
FOR DELETE
USING (auth.uid() = user_1 OR auth.uid() = user_2);

-- 3. Messages: Allow users to update their own sent messages
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (sender_id = auth.uid());

-- 4. Messages: Allow users to delete their own sent messages
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (sender_id = auth.uid());

-- 5. Notifications: No direct INSERT by users (created by triggers/SECURITY DEFINER functions)
CREATE POLICY "No direct notification creation by users"
ON public.notifications
FOR INSERT
WITH CHECK (false);

-- 6. Notifications: Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- 7. Profiles: Allow users to delete their own profile (GDPR compliance)
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);
