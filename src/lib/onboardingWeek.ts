// Client mirrors of current_onboarding_day() / current_week_start() in
// 20260928130000 and 20260929120000. The day rolls over at 06:00 local time,
// the week on Monday of that day. The browser timezone is the one
// useOnboardingData writes to profiles.timezone, so these agree with the DB.
const ROLLOVER_HOURS = 6;

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const onboardingDayDate = (now: Date) => {
  const d = new Date(now.getTime() - ROLLOVER_HOURS * 60 * 60 * 1000);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const getOnboardingDay = (now: Date = new Date()) => toIsoDate(onboardingDayDate(now));

export const getOnboardingWeekStart = (now: Date = new Date()) => {
  const day = onboardingDayDate(now);
  const sinceMonday = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - sinceMonday);
  return toIsoDate(day);
};

// Deterministic shuffle: the same seed gives the same order, so the vibe list
// doesn't jump around on re-render but does change from one day to the next.
export const seededShuffle = <T,>(items: T[], seed: string): T[] => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  const random = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
