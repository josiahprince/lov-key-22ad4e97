
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Zap, MapPin, Calendar } from 'lucide-react';
import { useMatches } from '@/hooks/useMatches';

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

const MatchingSystem = () => {
  const { generateMatches, getUserMatches, loading } = useMatches();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchResult, setMatchResult] = useState<{ matches_created: number; users_processed: number } | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    const userMatches = await getUserMatches();
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

  const getMatchScore = (score: number) => {
    if (score >= 60) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 40) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 20) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-gray-500' };
  };

  return (
    <div className="space-y-6">
      {/* Generate Matches Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <span>Daily Matching System</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            Generate up to 3 daily matches for all users based on mood compatibility, shared vibes, and location proximity.
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
                Generate Daily Matches
              </>
            )}
          </Button>

          {matchResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Successfully created {matchResult.matches_created} matches for {matchResult.users_processed} users
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Matches Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-rose-500" />
              <span>Current Matches</span>
            </div>
            <Badge variant="secondary">{matches.length} matches</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No matches found. Generate some matches to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => {
                const currentUser = match.profiles_user_1;
                const matchedUser = match.profiles_user_2;
                const scoreInfo = getMatchScore(match.match_score);
                
                return (
                  <div key={match.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-rose-400 to-pink-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {currentUser?.first_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {currentUser?.first_name} {currentUser?.last_name}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            {currentUser?.age && (
                              <span>{currentUser.age} years old</span>
                            )}
                            {currentUser?.city && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{currentUser.city}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Heart className="h-6 w-6 text-rose-500 mx-auto mb-1" />
                        <Badge className={`${scoreInfo.color} text-white text-xs`}>
                          {scoreInfo.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium text-right">
                            {matchedUser?.first_name} {matchedUser?.last_name}
                          </p>
                          <div className="flex items-center justify-end space-x-4 text-xs text-gray-600">
                            {matchedUser?.age && (
                              <span>{matchedUser.age} years old</span>
                            )}
                            {matchedUser?.city && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{matchedUser.city}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {matchedUser?.first_name?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Matched on {new Date(match.matched_on).toLocaleDateString()}</span>
                      </div>
                      <span>Score: {match.match_score}/100</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchingSystem;
