import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { X, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type GenderType = Database['public']['Enums']['gender_type'];
type OrientationType = Database['public']['Enums']['orientation_type'];
type InterestedInType = Database['public']['Enums']['interested_in_type'];

interface FilterPreferences {
  age_min: number;
  age_max: number;
  distance_km: number;
  sexual_orientation: OrientationType[];
  interested_in: InterestedInType[];
  personality_prompts: string[];
  languages_spoken: string[];
  interests: string[];
}

const ProfileFilters = ({ userProfile }: { userProfile: any }) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterPreferences>({
    age_min: 18,
    age_max: 65,
    distance_km: 50,
    sexual_orientation: [],
    interested_in: [],
    personality_prompts: [],
    languages_spoken: [],
    interests: []
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Available options
  const orientationOptions: OrientationType[] = ['straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'asexual', 'other'];
  const interestedInOptions: InterestedInType[] = ['men', 'women', 'non_binary', 'everyone'];
  const interestOptions = ['Music', 'Travel', 'Memes', 'Pets', 'Sports', 'Movies', 'Books', 'Cooking', 'Fitness', 'Art', 'Gaming', 'Photography'];
  const languageOptions = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian'];
  const personalityPrompts = ['Two truths and a lie', 'My perfect Sunday', 'What makes me happy', 'My biggest fear', 'Dream vacation', 'Favorite childhood memory'];

  useEffect(() => {
    if (userProfile) {
      console.log('ProfileFilters loading user profile:', userProfile);
      setFilters({
        age_min: userProfile.min_age_preference || 18,
        age_max: userProfile.max_age_preference || 65,
        distance_km: userProfile.max_distance_preference || 50,
        sexual_orientation: userProfile.sexual_orientation ? [userProfile.sexual_orientation] : [],
        interested_in: userProfile.interested_in ? [userProfile.interested_in] : [],
        personality_prompts: userProfile.personality_prompts ? Object.keys(userProfile.personality_prompts).filter(key => userProfile.personality_prompts[key]) : [],
        languages_spoken: userProfile.languages_spoken || userProfile.languages || [],
        interests: userProfile.interests || []
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Convert personality prompts back to object format
      const personalityPromptsObj = filters.personality_prompts.reduce((acc, prompt) => {
        acc[prompt] = userProfile.personality_prompts?.[prompt] || '';
        return acc;
      }, {} as Record<string, string>);

      const { error } = await supabase
        .from('profiles')
        .update({
          min_age_preference: filters.age_min,
          max_age_preference: filters.age_max,
          max_distance_preference: filters.distance_km,
          sexual_orientation: filters.sexual_orientation[0] || null,
          interested_in: filters.interested_in[0] || null,
          personality_prompts: personalityPromptsObj,
          languages_spoken: filters.languages_spoken,
          interests: filters.interests
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Filter preferences updated!"
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Error updating filters:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string, setter: (value: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filter</span>
        </Button>
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
                <Input
                  type="number"
                  value={filters.age_min}
                  onChange={(e) => setFilters(prev => ({ ...prev, age_min: parseInt(e.target.value) || 18 }))}
                  className="w-20"
                  min="18"
                  max="100"
                />
                <span>to</span>
                <Input
                  type="number"
                  value={filters.age_max}
                  onChange={(e) => setFilters(prev => ({ ...prev, age_max: parseInt(e.target.value) || 65 }))}
                  className="w-20"
                  min="18"
                  max="100"
                />
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
              <div className="text-sm text-gray-600">{filters.distance_km} km</div>
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

          {/* Personality Prompts */}
          <div>
            <Label className="text-base font-medium">Personality Prompts</Label>
            <div className="mt-2 space-y-2">
              {personalityPrompts.map(prompt => (
                <div key={prompt} className="flex items-center space-x-2">
                  <Checkbox
                    id={prompt}
                    checked={filters.personality_prompts.includes(prompt)}
                    onCheckedChange={() => toggleArrayItem(filters.personality_prompts, prompt, (newValue) => setFilters(prev => ({ ...prev, personality_prompts: newValue })))}
                  />
                  <Label htmlFor={prompt} className="text-sm">{prompt}</Label>
                </div>
              ))}
            </div>
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
                {interestOptions.filter(interest => !filters.interests.includes(interest)).map(interest => (
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

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileFilters;