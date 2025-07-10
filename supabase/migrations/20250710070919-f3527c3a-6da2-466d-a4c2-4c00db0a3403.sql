-- Allow users to view profiles of their matches
CREATE POLICY "Users can view profiles of their matches" 
ON profiles 
FOR SELECT 
USING (
  id IN (
    SELECT user_1 FROM matches WHERE user_2 = auth.uid() AND status = 'active'
    UNION
    SELECT user_2 FROM matches WHERE user_1 = auth.uid() AND status = 'active'
  )
);

-- Allow users to view onboarding data of their matches  
CREATE POLICY "Users can view onboarding of their matches" 
ON user_onboarding 
FOR SELECT 
USING (
  user_id IN (
    SELECT user_1 FROM matches WHERE user_2 = auth.uid() AND status = 'active'
    UNION
    SELECT user_2 FROM matches WHERE user_1 = auth.uid() AND status = 'active'
  )
);

-- Allow users to view photos of their matches
CREATE POLICY "Users can view photos of their matches" 
ON user_photos 
FOR SELECT 
USING (
  user_id IN (
    SELECT user_1 FROM matches WHERE user_2 = auth.uid() AND status = 'active'
    UNION
    SELECT user_2 FROM matches WHERE user_1 = auth.uid() AND status = 'active'
  )
);