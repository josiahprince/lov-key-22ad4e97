import { supabase } from '@/integrations/supabase/client';
import type { SelectedMemeDisplay } from '@/types/domain';
import { getMatchDayStart } from '@/lib/constants';
import { logError } from '@/lib/errorLogger';
import { getSignedPhotoUrl } from '@/lib/photoUrls';

// Matches handed out since today's 06:00 local boundary, counted the same way
// as generate_matches_internal()'s daily cap (anything not expired).
export const fetchTodayMatchCount = (userId: string) =>
  supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .or(`user_1.eq.${userId},user_2.eq.${userId}`)
    .neq('status', 'expired')
    .gte('matched_on', getMatchDayStart().toISOString());

// Legacy fallback only: rows saved before selected_memes_display existed have
// no persisted title/emoji, so this static table is the best-effort recovery
// for those. It won't match ids from AI-generated per-country vibes.
const LEGACY_MEME_MAP: Record<string, { emoji: string; title: string }> = {
  meme1: { emoji: '☕', title: 'Coffee Lover' },
  meme2: { emoji: '📚', title: 'Book Worm' },
  meme3: { emoji: '🌱', title: 'Plant Parent' },
  meme4: { emoji: '🦉', title: 'Night Owl' },
  meme5: { emoji: '🍜', title: 'Foodie' },
  meme6: { emoji: '🏏', title: 'Cricket Fanatic' },
  meme7: { emoji: '🌧️', title: 'Monsoon Mood' },
  meme8: { emoji: '🚇', title: 'Metro Survivor' },
  meme9: { emoji: '🥟', title: 'Street Food Explorer' },
  meme10: { emoji: '🎬', title: 'Bollywood Buff' },
  meme11: { emoji: '🚗', title: 'Traffic Philosopher' },
  meme12: { emoji: '🎉', title: 'Festival Enthusiast' },
  meme13: { emoji: '🏆', title: 'IPL Loyalist' },
  meme14: { emoji: '🦄', title: 'Startup Dreamer' },
  meme15: { emoji: '📱', title: 'Meme Connoisseur' },
};

const isSelectedMemeDisplayArray = (value: unknown): value is SelectedMemeDisplay[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).title === 'string' &&
      typeof (item as Record<string, unknown>).emoji === 'string'
  );

// Narrows a raw `selected_memes_display` Json column to the display shape.
// Returns undefined for legacy/malformed rows so callers fall back to
// getMemeDisplayInfo's legacy map rather than trusting an unchecked cast.
export const toSelectedMemeDisplay = (value: unknown): SelectedMemeDisplay[] | undefined =>
  isSelectedMemeDisplayArray(value) ? value : undefined;

const slugify = (title: string) =>
  title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Vibe ids are title slugs ("bollywood-buff"), so a title can be rebuilt from
// one. Old positional ids ("vibe2") and the "pending" placeholder carry no title.
const titleFromSlug = (id: string) => {
  if (id === 'pending' || /^(vibe|meme)\d+$/.test(id)) return null;
  const title = id
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return title || null;
};

const FALLBACK_VIBE_EMOJI = '✨';

// One entry per vibe the person picked (selected_memes is the source of truth).
// Each uses the title/emoji saved at selection time when there is one, then the
// legacy map, then a title rebuilt from the slug id, so a missing or partial
// selected_memes_display never hides a vibe.
export const getMemeDisplayInfo = (
  selectedMemes: string[] | null | undefined,
  selectedMemesDisplay?: unknown
): { emoji: string; title: string }[] => {
  const saved = isSelectedMemeDisplayArray(selectedMemesDisplay) ? selectedMemesDisplay : [];
  const ids = selectedMemes ?? [];

  if (ids.length === 0) return saved.map(({ emoji, title }) => ({ emoji, title }));

  return ids.flatMap((id) => {
    const match = saved.find((d) => d.id === id) ?? saved.find((d) => slugify(d.title) === id);
    if (match) return [{ emoji: match.emoji, title: match.title }];
    const legacy = LEGACY_MEME_MAP[id];
    if (legacy) return [legacy];
    const title = titleFromSlug(id);
    return title ? [{ emoji: FALLBACK_VIBE_EMOJI, title }] : [];
  });
};

// Most recent onboarding record for a user, excluding placeholder "pending" rows.
export const fetchLatestOnboarding = (userId: string) =>
  supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', userId)
    .neq('mood', 'pending_daily_update')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

export const fetchMainPhotoUrl = (userId: string) =>
  supabase
    .from('user_photos')
    .select('photo_url')
    .eq('user_id', userId)
    .eq('is_main', true)
    .maybeSingle();

export const fetchMatchedViewProfile = (userId: string) =>
  supabase.from('profiles_matched_view').select('*').eq('id', userId).maybeSingle();

// Everything a match or chat card shows about the other person, fetched in
// parallel. `source` only labels error logs. Failures are logged and leave that
// part null, so a card still renders with what could be loaded. The photo comes
// back as a signed URL (the bucket is private) plus whether the pair has
// revealed photos; until then cards show it blurred.
export const fetchMatchPartner = async (userId: string, source: string, matchId: string) => {
  const [profileRes, onboardingRes, photoRes] = await Promise.all([
    fetchMatchedViewProfile(userId),
    fetchLatestOnboarding(userId),
    fetchMainPhotoUrl(userId),
  ]);
  if (profileRes.error) logError(`${source}:profile:${userId}`, profileRes.error);
  if (onboardingRes.error) logError(`${source}:onboarding:${userId}`, onboardingRes.error);
  if (photoRes.error) logError(`${source}:photo:${userId}`, photoRes.error);
  const storedUrl = photoRes.data?.photo_url;
  const photo = storedUrl ? await getSignedPhotoUrl(storedUrl, userId, matchId) : null;
  return {
    profile: profileRes.data,
    onboarding: onboardingRes.data,
    photoUrl: photo?.signedUrl ?? null,
    photoRevealed: photo?.canViewUnblurred ?? false,
  };
};
