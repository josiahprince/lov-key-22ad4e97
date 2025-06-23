
import { Card } from '@/components/ui/card';
import { useOnboardingData } from '@/hooks/useOnboardingData';

interface ProfileInfoProps {
  userProfile: any;
}

const ProfileInfo = ({ userProfile }: ProfileInfoProps) => {
  const { onboardingData, loading } = useOnboardingData();

  // Use data from database if available, otherwise fall back to userProfile
  const mood = onboardingData?.mood || userProfile?.mood || 'happy';
  const selectedMemes = onboardingData?.selectedMemes || userProfile?.memes || [];
  const perfectSunday = onboardingData?.perfectSunday || userProfile?.promptAnswer || '';
  
  // Meme definitions
  const memes = [
    { id: 'meme1', title: 'Coffee Lover', emoji: '☕' },
    { id: 'meme2', title: 'Book Worm', emoji: '📚' },
    { id: 'meme3', title: 'Plant Parent', emoji: '🌱' },
    { id: 'meme4', title: 'Night Owl', emoji: '🦉' },
    { id: 'meme5', title: 'Foodie', emoji: '🍜' },
    { id: 'meme6', title: 'Cricket Fanatic', emoji: '🏏' },
    { id: 'meme7', title: 'Monsoon Mood', emoji: '🌧️' },
    { id: 'meme8', title: 'Metro Survivor', emoji: '🚇' },
    { id: 'meme9', title: 'Street Food Explorer', emoji: '🥟' },
    { id: 'meme10', title: 'Bollywood Buff', emoji: '🎬' },
    { id: 'meme11', title: 'Traffic Philosopher', emoji: '🚗' },
    { id: 'meme12', title: 'Festival Enthusiast', emoji: '🎉' },
    { id: 'meme13', title: 'IPL Loyalist', emoji: '🏆' },
    { id: 'meme14', title: 'Startup Dreamer', emoji: '🦄' },
    { id: 'meme15', title: 'Meme Connoisseur', emoji: '📱' },
  ];

  const selectedMemesData = selectedMemes.map(memeId => 
    memes.find(meme => meme.id === memeId)
  ).filter(Boolean);

  if (loading) {
    return (
      <Card className="p-6 space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Current Mood</h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-gray-600 capitalize">{mood}</span>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-700 mb-2">Today's Vibes</h3>
          <div className="space-y-2">
            {selectedMemesData.length > 0 ? (
              selectedMemesData.map((meme) => (
                <div key={meme.id} className="flex items-center space-x-2">
                  <span className="text-lg">{meme.emoji}</span>
                  <span className="text-gray-600">{meme.title}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-lg">📚</span>
                <span className="text-gray-600">Book Worm</span>
              </div>
            )}
          </div>
        </div>

        {perfectSunday && (
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Perfect Sunday</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600 text-sm leading-relaxed">{perfectSunday}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProfileInfo;
