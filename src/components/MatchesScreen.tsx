
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, MessageCircle, Zap, Users, MapPin, Calendar } from 'lucide-react';
import { useMatches } from '@/hooks/useMatches';
import { supabase } from '@/integrations/supabase/client';

interface Match {
  id: string;
  user_1: string;
  user_2: string;
  matched_on: string;
  match_score: number;
  status: string;
  profiles_user_1: {
    first_name: string;
    last_name: string;
    age: number;
    city: string;
  } | null;
  profiles_user_2: {
    first_name: string;
    last_name: string;
    age: number;
    city: string;
  } | null;
}

interface MatchesScreenProps {
  userProfile: any;
  onStartChat?: () => void;
}

const MatchesScreen = ({ userProfile, onStartChat }: MatchesScreenProps) => {
  const { generateMatches, getUserMatches, loading } = useMatches();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchResult, setMatchResult] = useState<{ matches_created: number; users_processed: number } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
    loadMatches();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadMatches = async () => {
    const userMatches = await getUserMatches();
    console.log('Loaded matches:', userMatches);
    setMatches(userMatches);
  };

  const handleGenerateMatches = async () => {
    const result = await generateMatches();
    if (result) {
      setMatchResult(result);
      // Reload matches to show new ones
      await loadMatches();
    }
  };

  const handleStartChat = (matchId: string, matchName: string) => {
    console.log('Starting chat with:', matchName, 'ID:', matchId);
    if (onStartChat) {
      onStartChat();
    }
  };

  const getMatchScore = (score: number) => {
    if (score >= 60) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 40) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 20) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-gray-500' };
  };

  return (
    <div className="p-6 space-y-6 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">Your Matches</h1>
        <p className="text-gray-600">Thoughtfully curated connections based on your preferences</p>
      </div>

      {/* Generate Matches Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <span>Daily Matching</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            Generate up to 3 daily matches based on mood compatibility, shared vibes, and location proximity.
          </div>
          
          <Button 
            onClick={handleGenerateMatches} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Matches...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Generate Today's Matches
              </>
            )}
          </Button>

          {matchResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Successfully created {matchResult.matches_created} new matches!
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Matches Section */}
      {matches.length === 0 ? (
        <Card className="p-6 text-center space-y-4">
          <Heart className="h-12 w-12 mx-auto text-gray-300" />
          <div>
            <p className="text-gray-600 mb-2">No matches found yet</p>
            <p className="text-sm text-gray-500">Generate some matches to get started!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            // Determine which profile is the other user (not the current user)
            const otherUser = match.user_1 === currentUserId 
              ? match.profiles_user_2 
              : match.profiles_user_1;
            
            if (!otherUser) return null;

            const scoreInfo = getMatchScore(match.match_score);
            
            return (
              <Card key={match.id} className="p-4 space-y-4 border-2 border-gray-100 hover:border-rose-200 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {otherUser.first_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {otherUser.first_name} {otherUser.last_name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {otherUser.age && (
                          <span>{otherUser.age} years old</span>
                        )}
                        {otherUser.city && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{otherUser.city}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Badge className={`${scoreInfo.color} text-white mb-2`}>
                      {scoreInfo.label}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {match.match_score}/100
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Matched on {new Date(match.matched_on).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    className="flex-1 py-2 rounded-xl border-gray-200 hover:border-gray-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Skip
                  </Button>
                  <Button 
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl"
                    onClick={() => handleStartChat(match.id, otherUser.first_name || 'Unknown')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Chat
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
        <div className="text-center space-y-2">
          <Heart className="w-6 h-6 mx-auto text-rose-500" />
          <p className="text-sm text-gray-700">
            New matches can be generated daily
          </p>
          <p className="text-xs text-gray-600">
            Quality over quantity - each match is carefully selected based on compatibility
          </p>
        </div>
      </Card>
    </div>
  );
};

export default MatchesScreen;
