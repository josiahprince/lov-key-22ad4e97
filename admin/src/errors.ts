// The admin SQL functions raise short codes; these are what staff see.
const MESSAGES: Record<string, string> = {
  not_authorized: "Your role doesn't allow this, or your sign-in needs its authenticator code again.",
  reason_required: 'Write a reason first. It goes in the audit log.',
  target_is_staff: "This person has a staff role. Remove their role before suspending or banning them.",
  end_date_must_be_in_future: 'Pick an end date in the future.',
  warnings_cannot_be_lifted: "Warnings can't be lifted.",
  report_not_found: 'That report no longer exists.',
  user_not_found: 'That account no longer exists.',
  restriction_not_found: 'That suspension or ban no longer exists.',
  last_super_admin: "You can't remove the last super admin.",
  invalid_credentials: "That email and password don't match a staff account.",
};

export const errorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error
    ? String((error as { message: unknown }).message)
    : '';
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  return MESSAGES[raw] ?? MESSAGES[code] ?? (raw || 'Something went wrong. Please try again.');
};
