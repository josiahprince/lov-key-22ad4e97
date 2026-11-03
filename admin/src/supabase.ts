import { createClient } from '@supabase/supabase-js';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Same project as src/integrations/supabase/client.ts (that file is generated,
// so the values are repeated here rather than exported from it). The key is
// the public anon key: everything the admin app can do is decided by the
// database (authorize()), never by this client. The service role key must
// never be used here.
const SUPABASE_URL = "https://iqgrlpstwxzonnjswefa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14";

// Its own storage key, so a staff sign-in never mixes with a member one.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storageKey: 'lovkey-admin-auth' },
});

export type AdminAction =
  | { action: 'restrict'; userId: string; kind: 'suspension' | 'ban'; endsAt?: string; reason: string }
  | { action: 'lift'; restrictionId: string; reason: string }
  | { action: 'photo_urls'; userId: string };

// Calls the admin-action edge function, turning its { error } body into a
// thrown Error so callers can show it.
export const adminAction = async <T,>(body: AdminAction): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('admin-action', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new Error(payload?.error ?? error.message);
    }
    throw error;
  }
  return data as T;
};
