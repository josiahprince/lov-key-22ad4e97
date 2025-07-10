
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
    <div className="p-6 space-y-6 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">Today's Matches</h1>
        <p className="text-gray-600">{matches.length} thoughtfully curated connections</p>
        <div className="text-sm text-gray-500">
          Skips remaining: {1 - skipsUsed}
        </div>
      </div>

      <div className="space-y-4">
        {visibleMatches.map((match) => (
          <Card key={match.id} className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-rose-50/30 hover:shadow-xl transition-all duration-300 animate-fade-in">
            {/* Header Section */}
            <div className="relative p-4 bg-gradient-to-r from-rose-500 to-pink-500">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                      <img 
                        src={match.mainPhoto} 
                        alt={match.name}
                        className="w-full h-full object-cover filter blur-sm"
                      />
                    </div>
                    <div className="absolute inset-0 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <span className="text-lg">{match.memes[0]?.emoji || '🌟'}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{match.name}</h3>
                    {match.city && (
                      <p className="text-white/80 text-xs">{match.city}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{match.compatibility}%</div>
                  <div className="text-xs text-white/80">match</div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4 space-y-3">
              {/* Current Mood Section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Current Mood</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 capitalize">{match.mood}</span>
                </div>
              </div>

              {/* Vibes Section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Your Vibes</p>
                <div className="flex flex-wrap gap-2">
                  {match.memes.map((meme, index) => (
                    <div key={index} className="flex items-center space-x-1 bg-white/60 px-2 py-1 rounded-full text-xs text-gray-700">
                      <span>{meme.emoji}</span>
                      <span>{meme.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Perfect Sunday Quote */}
              {match.promptAnswer && (
                <div className="bg-white/40 p-3 rounded-lg border-l-4 border-rose-300">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Perfect Sunday</p>
                  <p className="text-sm text-gray-700 italic leading-relaxed">"{match.promptAnswer}"</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <Button
                  onClick={() => handleSkip(match.id)}
                  disabled={skipsUsed >= 1}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Skip
                </Button>
                <Button 
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white border-0 shadow-md"
                  onClick={() => handleStartChat(match.id, match.name)}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                </Button>
              </div>
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
