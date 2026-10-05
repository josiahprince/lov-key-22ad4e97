// Mirror the database rules in 20260928120000_match_limits_and_expiry_notifications.sql.
export const MAX_ACTIVE_CHATS = 6;
export const MATCH_EXPIRY_HOURS = 24;
export const CHAT_INACTIVITY_HOURS = 48;
export const DAILY_MATCH_LIMIT = 2;

// Match days roll over at 06:00 local time, the same boundary as the daily
// onboarding (see current_match_day_start() in 20261005120000).
export const getMatchDayStart = (now: Date = new Date()) => {
  const start = new Date(now);
  start.setHours(6, 0, 0, 0);
  if (start > now) start.setDate(start.getDate() - 1);
  return start;
};

export const PHOTO_REVEAL_INITIAL_THRESHOLD = 60;
export const PHOTO_REVEAL_ROUND_EXTENSION = 30;

export type PhotoRevealChoice = 'reveal' | 'wait';

// Mirrors public.photo_reveal_threshold() in the database - round 1 asks at
// 60 messages, every round after a "wait" adds another 30.
export const getPhotoRevealThreshold = (round: number) =>
  PHOTO_REVEAL_INITIAL_THRESHOLD + PHOTO_REVEAL_ROUND_EXTENSION * (Math.max(round, 1) - 1);

// Messages already exchanged when the current round began, so progress reads
// as "13/30 towards the next check-in" instead of a lifetime total.
export const getPhotoRevealRoundStart = (round: number) =>
  round <= 1 ? 0 : getPhotoRevealThreshold(round - 1);

export const getPhotoUnlockCopy = (messageCount: number, round: number) => {
  const threshold = getPhotoRevealThreshold(round);
  const roundStart = getPhotoRevealRoundStart(round);
  const goal = threshold - roundStart;
  const current = Math.min(Math.max(messageCount - roundStart, 0), goal);

  // At the threshold the decision itself lives in the chat, so point there
  // rather than repeating a target they have already hit.
  if (messageCount >= threshold) {
    return {
      description: 'Photos unlock when you both choose to reveal them. Open the chat to make your choice.',
      progress: `${current}/${goal} messages`,
    };
  }

  return {
    description:
      round <= 1
        ? `You'll both get to choose about revealing photos after exchanging ${goal} messages.`
        : `Photos stay hidden. You'll both be asked again after another ${goal} messages.`,
    progress: `${current}/${goal} messages`,
  };
};
