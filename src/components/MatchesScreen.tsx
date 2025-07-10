
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
          <Card key={match.id} className="p-6 space-y-4 border-2 border-gray-100 hover:border-rose-200 transition-all duration-200 animate-fade-in">
            <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                    <img 
                      src={match.mainPhoto} 
                      alt={match.name}
                      className="w-full h-full object-cover filter blur-sm"
                    />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center opacity-90">
                    <span className="text-xl">{match.meme.emoji}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{match.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{match.mood} • {match.meme.title}</p>
                  {match.city && (
                    <p className="text-xs text-gray-500">{match.city}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-rose-600">{match.compatibility}% match</div>
                <div className="text-xs text-gray-500">compatibility</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 italic">"{match.promptAnswer}"</p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => handleSkip(match.id)}
                disabled={skipsUsed >= 1}
                variant="outline"
                className="flex-1 py-3 rounded-xl border-gray-200 hover:border-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Skip
              </Button>
              <Button 
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl"
                onClick={() => handleStartChat(match.id, match.name)}
              >
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
