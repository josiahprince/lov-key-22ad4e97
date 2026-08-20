import { Card } from '@/components/ui/card';
import { useCulturalVibes } from '@/hooks/useCulturalVibes';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
interface VibeCardProps {
  onboardingData: any;
  isMatchedUser?: boolean;
  matchedUserId?: string;
}
const VibeCard = ({
  onboardingData,
  isMatchedUser = false,
  matchedUserId
}: VibeCardProps) => {
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const {
    vibes: availableVibes
  } = useCulturalVibes(userCountry);
  useEffect(() => {
    const fetchCountry = async () => {
      // If viewing matched user, get their country
      if (isMatchedUser && matchedUserId) {
        const {
          data
        } = await supabase.from('profiles').select('country').eq('id', matchedUserId).single();
        if (data?.country) {
          setUserCountry(data.country);
        }
      } else {
        // Get current user's country
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (user) {
          const {
            data
          } = await supabase.from('profiles').select('country').eq('id', user.id).single();
          if (data?.country) {
            setUserCountry(data.country);
          }
        }
      }
    };
    fetchCountry();
  }, [isMatchedUser, matchedUserId]);
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy':
        return '😊';
      case 'chill':
        return '😎';
      case 'anxious':
        return '😰';
      case 'deep':
        return '🤔';
      case 'energetic':
        return '⚡';
      case 'sleepy':
        return '😴';
      default:
        return '😊';
    }
  };
  const getMemeData = () => {
    return availableVibes.filter(vibe => onboardingData?.selectedMemes?.includes(vibe.id));
  };
  return <Card className="p-4 space-y-4">
      <div className="text-center border-b pb-4">
        <h3 className="text-lg font-bold text-gray-800">
          {isMatchedUser ? 'Their Vibe' : 'Your Vibe'}
        </h3>
        {!isMatchedUser && <p className="text-sm text-gray-600">From your onboarding preferences</p>}
      </div>

      <div className="space-y-4">
        {/* Current Mood Section */}
        {onboardingData.mood && <div className="space-y-2">
            <p className="text-gray-700 font-medium">Current Mood:</p>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getMoodIcon(onboardingData.mood)}</span>
              <span className="text-gray-700 capitalize">{onboardingData.mood}</span>
            </div>
          </div>}

        {/* Selected Memes/Vibes */}
        {onboardingData.selectedMemes && onboardingData.selectedMemes.length > 0 && <div className="space-y-2">
            <p className="text-gray-700 font-medium">Vibes:</p>
            <div className="space-y-1">
              {getMemeData().map((meme, index) => <div key={index} className="flex items-center space-x-2 text-sm">
                  <span className="text-base">{meme.emoji}</span>
                  <span className="text-gray-600">{meme.title}</span>
                </div>)}
            </div>
          </div>}

        {/* Perfect Sunday */}
        {onboardingData.perfectSunday && <div className="space-y-2">
            <p className="text-gray-700 font-medium">Perfect Sunday:</p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-600 text-sm italic">"{onboardingData.perfectSunday}"</p>
            </div>
          </div>}
      </div>
    </Card>;
};
export default VibeCard;
