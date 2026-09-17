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
