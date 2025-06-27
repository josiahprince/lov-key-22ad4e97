
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, MapPin, Calendar, Heart, User, Smile, Meh, Frown, Zap, Coffee } from 'lucide-react';
import { useOnboardingData } from '@/hooks/useOnboardingData';

interface BasicInfoCardProps {
  userProfile: any;
  onEdit: () => void;
}

const BasicInfoCard = ({ userProfile, onEdit }: BasicInfoCardProps) => {
  const { onboardingData, loading: onboardingLoading } = useOnboardingData();

  if (!userProfile) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-gray-600 text-center">Loading profile information...</p>
        </CardContent>
      </Card>
    );
  }

  const formatAge = () => {
    if (userProfile.age) {
      return `Age: ${userProfile.age}`;
    }
    if (userProfile.date_of_birth) {
      const birthDate = new Date(userProfile.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return `Age: ${age}`;
    }
    return '';
  };

  const formatGenderOrientation = () => {
    const parts = [];
    if (userProfile.gender) {
      parts.push(`Gender: ${userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1).replace('_', '-')}`);
    }
    if (userProfile.sexual_orientation) {
      parts.push(`Orientation: ${userProfile.sexual_orientation.charAt(0).toUpperCase() + userProfile.sexual_orientation.slice(1)}`);
    }
    if (userProfile.interested_in) {
      parts.push(`Looking for: ${userProfile.interested_in.charAt(0).toUpperCase() + userProfile.interested_in.slice(1)}`);
    }
    return parts;
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy': return Smile;
      case 'chill': return Heart;
      case 'anxious': return Meh;
      case 'deep': return Frown;
      case 'energetic': return Zap;
      case 'sleepy': return Coffee;
      default: return Heart;
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'happy': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'chill': return 'bg-green-100 text-green-700 border-green-200';
      case 'anxious': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'deep': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'energetic': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'sleepy': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const memesList = [
    { id: 'meme1', title: 'Coffee Lover', description: 'When you need coffee to function', emoji: '☕' },
    { id: 'meme2', title: 'Book Worm', description: 'One more chapter...', emoji: '📚' },
    { id: 'meme3', title: 'Plant Parent', description: 'Talking to my plants daily', emoji: '🌱' },
    { id: 'meme4', title: 'Night Owl', description: '3 AM thoughts hit different', emoji: '🦉' },
    { id: 'meme5', title: 'Foodie', description: 'Photos of food > photos of myself', emoji: '🍜' },
    { id: 'meme6', title: 'Cricket Fanatic', description: 'Checking scores every 5 minutes', emoji: '🏏' },
    { id: 'meme7', title: 'Monsoon Mood', description: 'Chai and rain = perfect combo', emoji: '🌧️' },
    { id: 'meme8', title: 'Metro Survivor', description: 'Peak hour travel is an adventure', emoji: '🚇' },
    { id: 'meme9', title: 'Street Food Explorer', description: 'Gol gappa over fine dining', emoji: '🥟' },
    { id: 'meme10', title: 'Bollywood Buff', description: 'Can quote any SRK dialogue', emoji: '🎬' },
    { id: 'meme11', title: 'Traffic Philosopher', description: 'Deep thoughts during Silk Board jams', emoji: '🚗' },
    { id: 'meme12', title: 'Festival Enthusiast', description: 'Already planning next celebration', emoji: '🎉' },
    { id: 'meme13', title: 'IPL Loyalist', description: 'Team loyalty > everything else', emoji: '🏆' },
    { id: 'meme14', title: 'Startup Dreamer', description: 'Next unicorn idea loading...', emoji: '🦄' },
    { id: 'meme15', title: 'Meme Connoisseur', description: 'Instagram reels are my news source', emoji: '📱' },
  ];

  const getSelectedMemes = () => {
    return memesList.filter(meme => onboardingData?.selectedMemes?.includes(meme.id));
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Profile Information</CardTitle>
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
          <Edit2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Information Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h3>
          
          {/* Name and Age */}
          <div className="flex items-start space-x-3">
            <User className="h-4 w-4 text-gray-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-gray-900">
                {userProfile.first_name} {userProfile.last_name}
                {userProfile.nickname && ` (${userProfile.nickname})`}
              </p>
              {formatAge() && (
                <p className="text-sm text-gray-600">{formatAge()}</p>
              )}
            </div>
          </div>

          {/* Date of Birth */}
          {userProfile.date_of_birth && (
            <div className="flex items-start space-x-3">
              <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Born:</span> {new Date(userProfile.date_of_birth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Gender & Orientation Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Gender & Orientation</h3>
          
          <div className="flex items-start space-x-3">
            <Heart className="h-4 w-4 text-gray-500 mt-0.5" />
            <div className="space-y-1">
              {formatGenderOrientation().map((item, index) => (
                <p key={index} className="text-sm text-gray-900">{item}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Location Section */}
        {userProfile.location && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Location</h3>
            
            <div className="flex items-start space-x-3">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Location:</span> {userProfile.location}
                </p>
                {userProfile.city && userProfile.country && (
                  <p className="text-xs text-gray-600">
                    {userProfile.city}{userProfile.region && `, ${userProfile.region}`}, {userProfile.country}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Preferences Section */}
        {onboardingData && !onboardingLoading && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">My Preferences</h3>
            
            {/* Current Mood */}
            {onboardingData.mood && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Current Mood</p>
                <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${getMoodColor(onboardingData.mood)}`}>
                  {(() => {
                    const MoodIcon = getMoodIcon(onboardingData.mood);
                    return <MoodIcon className="w-4 h-4" />;
                  })()}
                  <span className="text-xs font-medium capitalize">{onboardingData.mood}</span>
                </div>
              </div>
            )}

            {/* Selected Vibes */}
            {onboardingData.selectedMemes && onboardingData.selectedMemes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">My Vibes</p>
                <div className="space-y-1">
                  {getSelectedMemes().map((meme) => (
                    <div key={meme.id} className="flex items-center space-x-2 px-2 py-1 bg-rose-50 border border-rose-200 rounded-md">
                      <span className="text-sm">{meme.emoji}</span>
                      <div>
                        <p className="text-xs font-medium">{meme.title}</p>
                        <p className="text-xs text-gray-600">{meme.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Perfect Sunday */}
            {onboardingData.perfectSunday && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Perfect Sunday</p>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-xs text-gray-700">{onboardingData.perfectSunday}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicInfoCard;
