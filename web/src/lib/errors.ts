// SHARED FILE. Turns database error codes into plain language (SRS NFR-USE-03).
const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Please sign in first.',
  ACCOUNT_INACTIVE: 'Your account is deactivated. Contact the Facilities Office.',
  DOMAIN_NOT_ALLOWED: 'Only IBA email addresses can register.',
  RESOURCE_UNAVAILABLE: 'This resource is not available for booking right now.',
  ROLE_NOT_ALLOWED: 'Your account type is not allowed to book this resource.',
  INVALID_RANGE: 'The end time must be after the start time.',
  IN_PAST: 'You cannot book a time in the past.',
  BEYOND_ADVANCE_WINDOW: 'This is too far ahead. Pick a nearer date.',
  DURATION_LIMITS: 'The booking is shorter or longer than this resource allows.',
  SLOT_ALIGNMENT: 'Start and end times must fall on the resource\'s slot boundaries (e.g. every 30 minutes).',
  OUTSIDE_HOURS: 'This resource is not bookable at those hours.',
  OVER_CAPACITY: 'Too many attendees for this resource.',
  BLACKOUT: 'This time is blocked (maintenance, exams or an event).',
  PURPOSE_REQUIRED: 'This resource needs admin approval - please describe the purpose.',
  SLOT_TAKEN: 'Someone else just booked that slot. Pick another time.',
  NOT_FOUND: 'We could not find that booking.',
  FORBIDDEN: 'You are not allowed to do that.',
  NOT_CANCELLABLE: 'This booking can no longer be cancelled.',
  ALREADY_STARTED: 'This booking has already started.',
  NOT_PENDING: 'This request has already been decided.',
  REASON_REQUIRED: 'Please write a reason when rejecting.',
};

// Supabase Auth error codes (sign-in, sign-up, verification, password reset).
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  email_not_confirmed: 'Verify your email first: enter the 6-digit code from the Register page.',
  otp_expired: 'That code is wrong or has expired. Request a new one.',
  over_email_send_rate_limit: 'Too many emails sent. Wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
  weak_password: 'That password is too weak. Use at least 8 characters.',
  user_already_exists: 'An account with this email already exists. Sign in instead.',
  email_exists: 'An account with this email already exists. Sign in instead.',
  same_password: 'Your new password must be different from the old one.',
  user_banned: 'Your account is deactivated. Contact the Facilities Office.',
};

export function friendlyError(err: unknown): string {
  const authCode = (err as { code?: string })?.code;
  if (authCode && AUTH_MESSAGES[authCode]) return AUTH_MESSAGES[authCode];
  if ((err as { status?: number })?.status === 429) return AUTH_MESSAGES.over_request_rate_limit;
  const msg = (err as { message?: string })?.message ?? String(err);
  const code = Object.keys(MESSAGES).find((c) => msg.includes(c));
  if (code) return MESSAGES[code];
  if (/Database error saving new user/i.test(msg)) return MESSAGES.DOMAIN_NOT_ALLOWED;
  return 'Something went wrong. Please try again.';
}
