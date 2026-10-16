import { isAuthError } from '@supabase/supabase-js';

// Supabase's own messages ("Signups not allowed for otp", "Token has expired
// or is invalid") mean nothing to the people using LovKey.
const MESSAGES: Partial<Record<string, string>> = {
  otp_disabled: 'No account uses this number yet. Tap "Sign up" below to create one.',
  otp_expired: 'That code is wrong or has expired. Check it, or ask for a new one.',
  phone_provider_disabled: "Text message codes aren't switched on yet. If you already have an account, sign in with your email and password.",
  sms_send_failed: "We couldn't send a text to that number. Check it and try again.",
  over_sms_send_rate_limit: 'Too many codes were sent to this number. Please wait a few minutes and try again.',
  over_email_send_rate_limit: 'Too many emails were sent. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
  phone_exists: 'Another account already uses this number. Sign in with it instead.',
  email_exists: 'Another account already uses this email. Use a different one, or sign in with that account.',
  email_address_invalid: "That email address doesn't look right. Check it and try again.",
  invalid_credentials: "That email and password don't match an account.",
  email_not_confirmed: "This email hasn't been confirmed yet. Sign in with your phone number to finish setting up your account.",
  weak_password: 'That password is too weak. Choose a longer one that mixes letters and numbers.',
  signup_disabled: 'New sign-ups are paused at the moment. Please try again later.',
};

export const authErrorMessage = (error: unknown): string => {
  if (isAuthError(error) && error.code) {
    const message = MESSAGES[error.code];
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
};
