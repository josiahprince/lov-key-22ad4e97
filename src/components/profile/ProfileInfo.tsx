
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Heart, Globe, Users, Book, Smile, Coffee, Edit } from 'lucide-react';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { useState } from 'react';
import ProfileEditModal from './ProfileEditModal';

interface ProfileInfoProps {
  userProfile: any;
}

const ProfileInfo = ({ userProfile }: ProfileInfoProps) => {
  const { onboardingData, loading: onboardingLoading } = useOnboardingData();
  const [showEditModal, setShowEditModal] = useState(false);

  if (!userProfile) {
    return (
      <Card className="p-4">
        <p className="text-gray-600 text-center">Loading profile information...</p>
      </Card>
    );
  }

  const formatInterests = (interests: string[]) => {
    if (!interests || interests.length === 0) return 'Not specified';
    return interests.join(', ');
  };

  const formatLanguages = (languages: string[]) => {
    if (!languages || languages.length === 0) return 'Not specified';
    return languages.join(', ');
  };

  const formatGender = (gender: string) => {
    if (!gender) return 'Not specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace('_', ' ');
  };

  const formatOrientation = (orientation: string) => {
    if (!orientation) return 'Not specified';
    return orientation.charAt(0).toUpperCase() + orientation.slice(1).replace('_', ' ');
  };

  const formatInterestedIn = (interestedIn: string) => {
    if (!interestedIn) return 'Not specified';
    return interestedIn.charAt(0).toUpperCase() + interestedIn.slice(1).replace('_', ' ');
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy': return '😊';
      case 'chill': return '😎';
      case 'anxious': return '😰';
      case 'deep': return '🤔';
      case 'energetic': return '⚡';
      case 'sleepy': return '😴';
      default: return '😊';
    }
  };

  const getMemeData = () => {
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

    return memes.filter(meme => 
      onboardingData?.selectedMemes?.includes(meme.id)
    );
  };

  return (
    <div className="space-y-4">
      {/* Basic Info Card */}
      <Card className="p-4 space-y-4">
        <div className="flex justify-between items-start border-b pb-4">
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold text-gray-800">
              {userProfile.nickname || userProfile.first_name || 'User'}
            </h2>
            <p className="text-gray-600 text-sm">
              {userProfile.first_name} {userProfile.last_name}
            </p>
          </div>
          <Button
            onClick={() => setShowEditModal(true)}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </Button>
        </div>

        <div className="space-y-3">
          {/* Age */}
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span className="text-gray-700">
              {userProfile.age ? `${userProfile.age} years old` : 'Age not specified'}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span className="text-gray-700">
              {userProfile.location || 'Location not specified'}
            </span>
          </div>

          {/* Gender & Orientation */}
          <div className="flex items-center space-x-3">
            <Heart className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span className="text-gray-700">
              {formatGender(userProfile.gender)} • {formatOrientation(userProfile.sexual_orientation)}
            </span>
          </div>

          {/* Interested In */}
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span className="text-gray-700">
              Looking for: {formatInterestedIn(userProfile.interested_in)}
            </span>
          </div>

          {/* Religion */}
          <div className="flex items-center space-x-3">
            <Book className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span className="text-gray-700">
              {userProfile.religion || 'Religion not specified'}
            </span>
          </div>

          {/* Languages */}
          <div className="flex items-start space-x-3">
            <Globe className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-gray-700 font-medium">Languages:</p>
              <p className="text-gray-600 text-sm">{formatLanguages(userProfile.languages)}</p>
            </div>
          </div>

          {/* Interests */}
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Interests & Hobbies:</p>
            {userProfile.interests && userProfile.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {userProfile.interests.map((interest: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No interests specified</p>
            )}
          </div>
        </div>
      </Card>

      {/* Onboarding Data Card */}
      {onboardingData && !onboardingLoading && (
        <Card className="p-4 space-y-4">
          <div className="text-center border-b pb-4">
            <h3 className="text-lg font-bold text-gray-800">Your Vibe</h3>
            <p className="text-sm text-gray-600">From your onboarding preferences</p>
          </div>

          <div className="space-y-4">
            {/* Current Mood */}
            {onboardingData.mood && (
              <div className="flex items-center space-x-3">
                <Smile className="w-5 h-5 text-rose-500" />
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getMoodIcon(onboardingData.mood)}</span>
                  <span className="text-gray-700 capitalize">{onboardingData.mood}</span>
                </div>
              </div>
            )}

            {/* Selected Memes/Vibes */}
            {onboardingData.selectedMemes && onboardingData.selectedMemes.length > 0 && (
              <div className="space-y-2">
                <p className="text-gray-700 font-medium">Your Vibes:</p>
                <div className="space-y-1">
                  {getMemeData().map((meme, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <span className="text-base">{meme.emoji}</span>
                      <span className="text-gray-600">{meme.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Perfect Sunday */}
            {onboardingData.perfectSunday && (
              <div className="space-y-2">
                <p className="text-gray-700 font-medium">Perfect Sunday:</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600 text-sm italic">"{onboardingData.perfectSunday}"</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        userProfile={userProfile}
      />
    </div>
  );
};

export default ProfileInfo;
