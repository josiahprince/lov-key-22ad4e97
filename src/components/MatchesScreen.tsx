
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, MessageCircle, Loader2 } from 'lucide-react';
import { useMatches } from '@/hooks/useMatches';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MatchesScreenProps {
  userProfile: any;
  onStartChat?: () => void;
}

const MatchesScreen = ({ userProfile, onStartChat }: MatchesScreenProps) => {
  const [skipsUsed, setSkipsUsed] = useState(0);
  const [skippedProfiles, setSkippedProfiles] = useState<string[]>([]);
  const { matches, loading, refetch } = useMatches();
  const { toast } = useToast();

  const handleSkip = async (profileId: string) => {
    if (skipsUsed < 1) {
      setSkipsUsed(skipsUsed + 1);
      setSkippedProfiles(prev => [...prev, profileId]);
      
      // Update match status in database
      try {
        const { error } = await supabase
          .from('matches')
          .update({ status: 'skipped' })
          .eq('id', profileId);
        
        if (error) {
          console.error('Error updating match status:', error);
        }
      } catch (error) {
        console.error('Error skipping match:', error);
      }
    }
  };

  const handleStartChat = async (matchId: string, matchName: string) => {
    console.log('Starting chat with:', matchName, 'ID:', matchId);
    
    // Update match status to indicate chat started
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'chatting' })
        .eq('id', matchId);
      
      if (error) {
        console.error('Error updating match status:', error);
      } else {
        toast({
          title: "Chat started!",
          description: `You can now chat with ${matchName}`,
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
    
    if (onStartChat) {
      onStartChat();
    }
  };

  const visibleMatches = matches.filter(match => !skippedProfiles.includes(match.id));

  if (loading) {
    return (
      <div className="p-6 space-y-6 pb-20">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">Today's Matches</h1>
          <p className="text-gray-600">Finding your perfect connections...</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-lg font-bold text-gray-800">Today's Matches</h1>
        <p className="text-sm text-gray-600">{matches.length} thoughtfully curated connections</p>
        <div className="text-xs text-gray-500">
          Skips remaining: {1 - skipsUsed}
        </div>
      </div>

      <div className="space-y-3">
        {visibleMatches.map((match) => (
          <Card key={match.id} className="p-4 space-y-3 bg-gray-50 border-gray-200 animate-fade-in">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-rose-100">
                  <img 
                    src={match.mainPhoto} 
                    alt={match.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{match.name}</h3>
                  {match.city && (
                    <p className="text-xs text-gray-600">{match.city}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-rose-600">{match.compatibility}%</div>
                <div className="text-xs text-gray-500">match</div>
              </div>
            </div>

            {/* Current Mood */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Current Mood</h4>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full"></div>
                <span className="text-sm text-gray-600 capitalize">{match.mood}</span>
              </div>
            </div>

            {/* Vibes Section */}
            {match.memes.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Their Vibes</h4>
                <div className="space-y-1">
                  {match.memes.map((meme, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-rose-50 border border-rose-200 rounded-lg">
                      <div className="text-sm">{meme.emoji}</div>
                      <div>
                        <span className="text-xs font-medium text-gray-700">{meme.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Perfect Sunday Quote */}
            {match.promptAnswer && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Perfect Sunday</h4>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-700">"{match.promptAnswer}"</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button
                onClick={() => handleSkip(match.id)}
                disabled={skipsUsed >= 1}
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
              >
                <X className="w-4 h-4 mr-1" />
                Skip
              </Button>
              <Button 
                size="sm"
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
                onClick={() => handleStartChat(match.id, match.name)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Chat
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {visibleMatches.length === 0 && (
        <Card className="p-4 text-center space-y-2 bg-gray-50">
          <p className="text-sm text-gray-600">No more matches for today</p>
          <p className="text-xs text-gray-500">New matches arrive daily at 9 AM</p>
        </Card>
      )}

      <Card className="p-4 bg-rose-50 border-rose-200">
        <div className="text-center space-y-2">
          <Heart className="w-5 h-5 mx-auto text-rose-500" />
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
