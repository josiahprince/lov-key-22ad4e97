
import { Card } from '@/components/ui/card';

interface ProfileInfoProps {
  userProfile: any;
}

const ProfileInfo = ({ userProfile }: ProfileInfoProps) => {
  // Provide fallback values if userProfile properties are missing
  const mood = userProfile?.mood || 'happy';
  const selectedMemes = userProfile?.memes || [];
  
  // Find the first selected meme to display as "Today's Vibe"
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

  const firstSelectedMeme = selectedMemes.length > 0 
    ? memes.find(meme => meme.id === selectedMemes[0])
    : memes[1]; // Default to Book Worm

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-3">
        <div>
          <h3 className="font-medium text-gray-700">Current Mood</h3>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-gray-600 capitalize">{mood}</span>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-700">Today's Vibe</h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-lg">{firstSelectedMeme?.emoji || '📚'}</span>
            <span className="text-gray-600">{firstSelectedMeme?.title || 'Book Worm'}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProfileInfo;
