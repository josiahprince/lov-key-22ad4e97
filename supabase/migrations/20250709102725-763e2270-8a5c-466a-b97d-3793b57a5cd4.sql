-- Call the edge function to generate daily matches
SELECT * FROM supabase_functions.http_request(
  'POST',
  'https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/generate-daily-matches',
  '{"Content-Type": "application/json"}',
  '{}'
)