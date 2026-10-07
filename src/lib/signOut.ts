import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';

const SIGN_OUT_TIMEOUT_MS = 5000;

// supabase.auth.signOut() only forgets the session after the server confirms.
// If that request fails (offline, a stale refresh token, a server error) or
// hangs, it returns an error and leaves you signed in, so a plain button looks
// like it does nothing. This always signs out on this device.
export const signOut = async () => {
  try {
    const result = await Promise.race([
      supabase.auth.signOut(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('signOut timed out')), SIGN_OUT_TIMEOUT_MS)),
    ]);
    if (!result.error) return;
    logError('signOut', result.error);
  } catch (error) {
    logError('signOut', error);
  }

  // Drop the stored session ourselves and reload, so the in-memory client
  // starts fresh on the sign-in screen.
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('sb-') && key.includes('-auth-token'))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable: the reload below still shows sign-in once the
    // expired session is rejected.
  }
  window.location.assign('/');
};
