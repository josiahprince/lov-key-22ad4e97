-- Delete matches with non-existent users
DELETE FROM matches 
WHERE user_1 = 'fb0dbdaa-7f42-451d-9a80-8cb0fd93abe1' 
AND user_2 NOT IN (SELECT id FROM profiles);

DELETE FROM matches 
WHERE user_2 = 'fb0dbdaa-7f42-451d-9a80-8cb0fd93abe1' 
AND user_1 NOT IN (SELECT id FROM profiles);

-- Create new matches with existing users for the current user
INSERT INTO matches (user_1, user_2, match_score, matched_on, status) VALUES
('fb0dbdaa-7f42-451d-9a80-8cb0fd93abe1', '743126d0-824c-4a3b-ac69-50df8b48c71d', 85, now(), 'active'),
('fb0dbdaa-7f42-451d-9a80-8cb0fd93abe1', 'd8038209-51fe-4df9-9559-15a9ba6b4476', 75, now(), 'active'),
('fb0dbdaa-7f42-451d-9a80-8cb0fd93abe1', 'a478d9ea-44ec-41cc-9098-96b67efb4890', 70, now(), 'active')
ON CONFLICT DO NOTHING;