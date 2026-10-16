import type { User } from '@supabase/supabase-js';

// Accounts created before this were auto-confirmed (mostly test accounts) and
// are left as they are. Anyone who signs up from this moment on must verify
// both a mobile number (SMS code) and an email address (emailed code).
// Must match verification_required_from() in
// supabase/migrations/20261016120000_account_verification.sql.
export const VERIFICATION_REQUIRED_FROM = '2026-10-16T00:00:00Z';

// Supabase only allows a new code to the same number or address once a minute.
export const RESEND_COOLDOWN_SECONDS = 60;

export type VerificationStep = 'phone' | 'email';

// The step a signed-in user still has to finish before using LovKey, or null.
// Sign-up starts with the phone, so 'phone' only comes up for an account
// created another way (for example straight through the API with an email).
export const pendingVerificationStep = (user: User): VerificationStep | null => {
  if (new Date(user.created_at) < new Date(VERIFICATION_REQUIRED_FROM)) return null;
  if (!user.phone_confirmed_at) return 'phone';
  if (!user.email_confirmed_at) return 'email';
  return null;
};
