import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { X, SlidersHorizontal, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type { ProfileLike } from '@/types/domain';
import { getLanguageOptions } from '@/lib/languages';
import { INTEREST_OPTIONS } from '@/lib/profileOptions';
import { fetchTodayMatchCount } from '@/lib/matchQueries';
import { DAILY_MATCH_LIMIT } from '@/lib/constants';
import { logError } from '@/lib/errorLogger';

const MIN_AGE = 18;
const MAX_AGE = 100;
const AUTOSAVE_DELAY_MS = 600;

type OrientationType = Database['public']['Enums']['orientation_type'];
type InterestedInType = Database['public']['Enums']['interested_in_type'];

interface FilterPreferences {
  age_min: number;
  age_max: number;
  distance_km: number;
  sexual_orientation: OrientationType[];
  interested_in: InterestedInType[];
  languages_spoken: string[];
  interests: string[];
}

const ProfileFilters = ({
  userProfile,
  trigger,
  onSaved,
}: {
  userProfile: ProfileLike | null;
  trigger?: ReactNode;
  onSaved?: (patch: Partial<ProfileLike>) => void;
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterPreferences>({
    age_min: 18,
    age_max: 65,
    distance_km: 50,
    sexual_orientation: [],
    interested_in: [],
    languages_spoken: [],
    interests: []
  });
  // Preferences as they were when the dialog opened, for the next-day notice.
  const [openedFilters, setOpenedFilters] = useState<FilterPreferences | null>(null);
  // Today's matches are all handed out, so new preferences only shape tomorrow's.
  const [todaysMatchesDone, setTodaysMatchesDone] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // Last state persisted to the database, and the pending autosave.
  const savedRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const { toast } = useToast();

  const hasChanges = openedFilters !== null && JSON.stringify(filters) !== JSON.stringify(openedFilters);
  const showNextDayNotice = todaysMatchesDone && hasChanges;

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    fetchTodayMatchCount(user.id).then(({ count, error }) => {
      if (cancelled) return;
      if (error) {
        logError('ProfileFilters:todayMatches', error);
        return;
      }
      setTodaysMatchesDone((count ?? 0) >= DAILY_MATCH_LIMIT);
    });
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  // Available options
  const orientationOptions: OrientationType[] = ['straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'asexual', 'other'];
  const interestedInOptions: InterestedInType[] = ['men', 'women', 'non_binary', 'everyone'];
  const languageOptions = getLanguageOptions(userProfile?.country);
  const ageOptions = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);

  useEffect(() => {
    // Don't overwrite edits in progress if the profile refreshes while open.
    if (userProfile && !openRef.current) {
      const loaded: FilterPreferences = {
        age_min: Math.min(Math.max(userProfile.min_age_preference || MIN_AGE, MIN_AGE), MAX_AGE),
        age_max: Math.min(Math.max(userProfile.max_age_preference || 65, MIN_AGE), MAX_AGE),
        distance_km: userProfile.max_distance_preference || 50,
        sexual_orientation: userProfile.sexual_orientation ? [userProfile.sexual_orientation] : [],
        interested_in: userProfile.interested_in ? [userProfile.interested_in] : [],
        languages_spoken: userProfile.languages_spoken || userProfile.languages || [],
        interests: userProfile.interests || []
      };
      setFilters(loaded);
      savedRef.current = JSON.stringify(loaded);
    }
  }, [userProfile]);

  const persist = useCallback(async (next: FilterPreferences) => {
    if (!user) return;
    const serialized = JSON.stringify(next);
    if (serialized === savedRef.current) return;

    setSaveStatus('saving');
    const patch = {
      min_age_preference: next.age_min,
      max_age_preference: next.age_max,
      max_distance_preference: next.distance_km,
      sexual_orientation: next.sexual_orientation[0] || null,
      interested_in: next.interested_in[0] || null,
      languages_spoken: next.languages_spoken,
      interests: next.interests
    };
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);

    if (error) {
      logError('ProfileFilters:save', error);
      setSaveStatus('error');
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive"
      });
      return;
    }
    savedRef.current = serialized;
    setSaveStatus('saved');
    onSaved?.(patch);
  }, [user, toast, onSaved]);

  // Autosave shortly after the last change, so dragging the distance slider
  // or ticking several languages makes one write rather than many.
  useEffect(() => {
    if (!open) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persist(filters);
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [filters, open, persist]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpenedFilters(filters);
      setSaveStatus('idle');
    } else if (saveTimerRef.current) {
      // Closing mid-debounce: save now rather than dropping the last change.
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      void persist(filters);
    }
    setOpen(next);
  };

  const toggleArrayItem = (array: string[], item: string, setter: (value: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Preferences</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Preferences</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Age Range */}
          <div>
            <Label className="text-base font-medium">Age Range</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-4">
                <Select value={String(filters.age_min)} onValueChange={(value) => setFilters(prev => ({ ...prev, age_min: Number(value) }))}>
                  <SelectTrigger className="w-24" aria-label="Minimum age">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ageOptions.filter(age => age <= filters.age_max).map(age => (
                      <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>to</span>
                <Select value={String(filters.age_max)} onValueChange={(value) => setFilters(prev => ({ ...prev, age_max: Number(value) }))}>
                  <SelectTrigger className="w-24" aria-label="Maximum age">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ageOptions.filter(age => age >= filters.age_min).map(age => (
                      <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>years</span>
              </div>
            </div>
          </div>

          {/* Distance */}
          <div>
            <Label className="text-base font-medium">Distance (km)</Label>
            <div className="mt-2 space-y-2">
              <Slider
                value={[filters.distance_km]}
                onValueChange={(value) => setFilters(prev => ({ ...prev, distance_km: value[0] }))}
                max={200}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground">{filters.distance_km} km</div>
            </div>
          </div>

          {/* Sexual Orientation */}
          <div>
            <Label className="text-base font-medium">Sexual Orientation</Label>
            <Select value={filters.sexual_orientation[0] || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, sexual_orientation: [value as OrientationType] }))}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select orientation" />
              </SelectTrigger>
              <SelectContent>
                {orientationOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interested In */}
          <div>
            <Label className="text-base font-medium">Interested In</Label>
            <Select value={filters.interested_in[0] || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, interested_in: [value as InterestedInType] }))}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select interest" />
              </SelectTrigger>
              <SelectContent>
                {interestedInOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Languages Spoken */}
          <div>
            <Label className="text-base font-medium">Languages Spoken</Label>
            <div className="mt-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {filters.languages_spoken.map(lang => (
                  <Badge key={lang} variant="secondary" className="flex items-center gap-1">
                    {lang}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleArrayItem(filters.languages_spoken, lang, (newValue) => setFilters(prev => ({ ...prev, languages_spoken: newValue })))}
                    />
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {languageOptions.filter(lang => !filters.languages_spoken.includes(lang)).map(lang => (
                  <Button
                    key={lang}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleArrayItem(filters.languages_spoken, lang, (newValue) => setFilters(prev => ({ ...prev, languages_spoken: newValue })))}
                    className="text-xs"
                  >
                    {lang}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Interests */}
          <div>
            <Label className="text-base font-medium">Interests</Label>
            <div className="mt-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {filters.interests.map(interest => (
                  <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                    {interest}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleArrayItem(filters.interests, interest, (newValue) => setFilters(prev => ({ ...prev, interests: newValue })))}
                    />
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {INTEREST_OPTIONS.filter(interest => !filters.interests.includes(interest)).map(interest => (
                  <Button
                    key={interest}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleArrayItem(filters.interests, interest, (newValue) => setFilters(prev => ({ ...prev, interests: newValue })))}
                    className="text-xs"
                  >
                    {interest}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {showNextDayNotice && (
          <div role="status" className="mt-6 flex gap-2 rounded-md border bg-muted/50 p-3 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p>
              Your {DAILY_MATCH_LIMIT} matches for today are already chosen. These changes will apply from tomorrow's matches.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-6">
          <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'All changes saved'}
            {saveStatus === 'error' && <span className="text-destructive">Couldn't save. Try changing it again.</span>}
            {saveStatus === 'idle' && 'Changes save automatically'}
          </span>
          <Button onClick={() => handleOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileFilters;
