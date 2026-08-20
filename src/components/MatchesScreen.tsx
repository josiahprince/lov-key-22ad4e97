import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, MessageCircle, Loader2, Send, Check, Clock } from 'lucide-react';
import { useMatches } from '@/hooks/useMatches';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
interface MatchProfile {
  id: string;
  userId: string; // The matched user's ID
  name: string;
  age?: number;
  mood: string;
  memes: {
    emoji: string;
    title: string;
  }[];
  promptAnswer: string;
  compatibility: number;
  mainPhoto: string;
  city?: string;
  region?: string;
  country?: string;
  chatRequestStatus: string;
  chatRequestSender?: string;
  expiresAt?: string;
}
interface MatchesScreenProps {
  userProfile: any;
  onStartChat?: (matchData: {
    matchId: string;
    matchedUserId: string;
    matchedUserName: string;
    matchedUserVibes: string;
  }) => void;
  onNavigateToChats?: () => void;
}
const MatchesScreen = ({
  userProfile,
  onStartChat,
  onNavigateToChats
}: MatchesScreenProps) => {
  const [skippedProfiles, setSkippedProfiles] = useState<string[]>([]);
  const [processingRequests, setProcessingRequests] = useState<string[]>([]);
  const {
    matches,
    loading,
    refetch
  } = useMatches();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const handleViewProfile = (match: any) => {
    navigate(`/match/${match.id}`);
  };
  const handleSkip = async (profileId: string) => {
    setSkippedProfiles(prev => [...prev, profileId]);

    // Update match status in database
    try {
      const {
        error
      } = await supabase.from('matches').update({
        status: 'skipped'
      }).eq('id', profileId);
      if (error) { /* no-op */ }
    } catch (error) { /* no-op */ }
  };
  const handleSendChatRequest = async (match: any) => {
    if (processingRequests.includes(match.id)) return;
    try {
      setProcessingRequests(prev => [...prev, match.id]);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        error
      } = await supabase.from('matches').update({
        chat_request_status: 'pending',
        chat_request_sender: user.id
      }).eq('id', match.id);
      if (error) {
        toast({
          title: "Error",
          description: "Failed to send chat request. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Chat request sent!",
          description: `Your chat request has been sent to ${match.name}`
        });
        refetch(); // Refresh matches to show updated status
      }
    } catch (error) { /* no-op */ } finally {
      setProcessingRequests(prev => prev.filter(id => id !== match.id));
    }
  };
  const handleAcceptChatRequest = async (match: any) => {
    if (processingRequests.includes(match.id)) return;
    try {
      setProcessingRequests(prev => [...prev, match.id]);
      const {
        data,
        error
      } = await supabase.from('matches').update({
        chat_request_status: 'accepted',
        status: 'chatting',
        // Update status to chatting when accepted
        last_interaction_at: new Date().toISOString()
      }).eq('id', match.id).select(); // Add select to get the updated data back

      if (error) {
        toast({
          title: "Error",
          description: "Failed to accept chat request. Please try again.",
          variant: "destructive"
        });
        return;
      }
      if (!data || data.length === 0) {
        toast({
          title: "Error",
          description: "Failed to update chat request. Please try again.",
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "Chat request accepted!",
        description: `You can now chat with ${match.name}`
      });

      // Wait a moment for the database to be fully updated and real-time to propagate
      await new Promise(resolve => setTimeout(resolve, 800));

      // Refetch matches to remove the accepted chat from matches list
      await refetch();

      // Navigate to chats screen after accepting
      if (onNavigateToChats) {
        onNavigateToChats();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingRequests(prev => prev.filter(id => id !== match.id));
    }
  };
  const getChatButtonContent = (match: any) => {
    const currentUserId = userProfile?.id; // Use userProfile passed as prop
    const isProcessing = processingRequests.includes(match.id);
    if (isProcessing) {
      return {
        text: "Processing...",
        icon: <Loader2 className="w-4 h-4 mr-1 animate-spin" />,
        disabled: true,
        onClick: () => {},
        variant: "outline" as const
      };
    }

    // If chat request is accepted, they can chat
    if (match.chatRequestStatus === 'accepted') {
      return {
        text: "Go to Chats",
        icon: <MessageCircle className="w-4 h-4 mr-1" />,
        disabled: false,
        onClick: () => {
          if (onNavigateToChats) onNavigateToChats();
        },
        variant: "default" as const
      };
    }

    // If there's a pending request
    if (match.chatRequestStatus === 'pending') {
      // If current user sent the request, show "Request Sent"
      if (match.chatRequestSender === currentUserId) {
        return {
          text: "Request Sent",
          icon: <Send className="w-4 h-4 mr-1" />,
          disabled: true,
          onClick: () => {},
          variant: "outline" as const
        };
      } else {
        // If other user sent the request, show "Accept Chat Request"
        return {
          text: "Accept Request",
          icon: <Check className="w-4 h-4 mr-1" />,
          disabled: false,
          onClick: () => handleAcceptChatRequest(match),
          variant: "default" as const
        };
      }
    }

    // Default: Send Chat Request
    return {
      text: "Send Request",
      icon: <Send className="w-4 h-4 mr-1" />,
      disabled: false,
      onClick: () => handleSendChatRequest(match),
      variant: "default" as const
    };
  };
  const visibleMatches = matches.filter(match => !skippedProfiles.includes(match.id));
  if (loading) {
    return <div className="p-6 space-y-6 pb-20">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">Today's Matches</h1>
          <p className="text-gray-600">Finding your perfect connections...</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      </div>;
  }
  return <div className="px-4 space-y-4 pb-20">
        <div className="text-center space-y-2">
          <h1 className="text-lg font-bold text-gray-800">Today's Matches</h1>
          <p className="text-sm text-gray-600">{matches.length} thoughtfully curated connections</p>
        </div>

      <div className="space-y-3">
        {visibleMatches.map(match => <Card key={match.id} className="p-4 space-y-3 bg-gray-50 border-gray-200 animate-fade-in cursor-pointer hover:bg-lavender transition-colors" onClick={() => handleViewProfile(match)}>
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-rose-100">
                  <img src={match.mainPhoto} alt={match.name} className="w-full h-full object-cover blur-sm" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{match.name}</h3>
                  {match.age && <p className="text-xs text-gray-600">{match.age} years</p>}
                </div>
              </div>
              <div className="text-right">
                
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
            {match.memes.length > 0 && <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Their Vibes</h4>
                <div className="flex flex-wrap gap-2">
                  {match.memes.map((meme, index) => <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg">
                      <div className="text-xs">{meme.emoji}</div>
                      <span className="text-xs font-medium text-gray-700">{meme.title}</span>
                    </div>)}
                </div>
              </div>}

            {/* Perfect Sunday Quote */}
            {match.promptAnswer && <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Perfect Sunday</h4>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-700">"{match.promptAnswer}"</p>
                </div>
              </div>}

            {/* Expiry Timer */}
            {match.expiresAt && <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>
                  Expires {formatDistanceToNow(new Date(match.expiresAt), {
              addSuffix: true
            })}
                </span>
              </div>}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button onClick={e => {
            e.stopPropagation();
            handleSkip(match.id);
          }} variant="outline" size="sm" className="flex-1 rounded-xl">
                <X className="w-4 h-4 mr-1" />
                Skip
              </Button>
              {(() => {
            const buttonConfig = getChatButtonContent(match);
            return <Button size="sm" variant={buttonConfig.variant} disabled={buttonConfig.disabled} className={`flex-1 rounded-xl ${buttonConfig.variant === 'default' ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}`} onClick={e => {
              e.stopPropagation();
              buttonConfig.onClick();
            }}>
                    {buttonConfig.icon}
                    {buttonConfig.text}
                  </Button>;
          })()}
            </div>
          </Card>)}
      </div>

      {visibleMatches.length === 0 && <Card className="p-4 text-center space-y-2 bg-gray-50">
          <p className="text-sm text-gray-600">No more matches for today</p>
          <p className="text-xs text-gray-500">New matches arrive daily at 9 AM</p>
        </Card>}

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
    </div>;
};
export default MatchesScreen;
