
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, MessageCircle } from 'lucide-react';

const MatchesScreen = ({ userProfile }: { userProfile: any }) => {
  const [skipsUsed, setSkipsUsed] = useState(0);
  const [skippedProfiles, setSkippedProfiles] = useState<number[]>([]);
  const [matches] = useState([
    {
      id: 1,
      name: 'Alex',
      mood: 'chill',
      meme: { emoji: '📚', title: 'Book Worm' },
      promptAnswer: "Perfect Sunday? Coffee shop with a good book, then maybe a walk in Cubbon Park. Simple pleasures!",
      compatibility: 85
    },
    {
      id: 2,
      name: 'Sam',
      mood: 'happy',
      meme: { emoji: '🌱', title: 'Plant Parent' },
      promptAnswer: "Tending to my plants, cooking something new, and maybe a movie night. What about you?",
      compatibility: 78
    },
    {
      id: 3,
      name: 'Jordan',
      mood: 'deep',
      meme: { emoji: '🦉', title: 'Night Owl' },
      promptAnswer: "Honestly? Journaling, listening to indie music, and having deep conversations with close friends.",
      compatibility: 92
    }
  ]);

  const handleSkip = (profileId: number) => {
    if (skipsUsed < 3) {
      setSkipsUsed(skipsUsed + 1);
      setSkippedProfiles(prev => [...prev, profileId]);
    }
  };

  const visibleMatches = matches.filter(match => !skippedProfiles.includes(match.id));

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">Today's Matches</h1>
        <p className="text-gray-600">6 thoughtfully curated connections</p>
        <div className="text-sm text-gray-500">
          Skips remaining: {3 - skipsUsed}
        </div>
      </div>

      <div className="space-y-4">
        {visibleMatches.map((match) => (
          <Card key={match.id} className="p-6 space-y-4 border-2 border-gray-100 hover:border-rose-200 transition-all duration-200 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">{match.meme.emoji}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{match.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{match.mood} • {match.meme.title}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-rose-600">{match.compatibility}% match</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 italic">"{match.promptAnswer}"</p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => handleSkip(match.id)}
                disabled={skipsUsed >= 3}
                variant="outline"
                className="flex-1 py-3 rounded-xl border-gray-200 hover:border-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Skip
              </Button>
              <Button className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl">
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Chat
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {visibleMatches.length === 0 && (
        <Card className="p-6 text-center space-y-2">
          <p className="text-gray-600">No more matches for today</p>
          <p className="text-sm text-gray-500">New matches arrive daily at 9 AM</p>
        </Card>
      )}

      <Card className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
        <div className="text-center space-y-2">
          <Heart className="w-6 h-6 mx-auto text-rose-500" />
          <p className="text-sm text-gray-700">
            New matches arrive daily at 9 AM
          </p>
          <p className="text-xs text-gray-600">
            Quality over quantity - each match is carefully selected
          </p>
        </div>
      </Card>
    </div>
  );
};

export default MatchesScreen;
