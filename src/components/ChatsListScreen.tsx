import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Clock, Loader2, User, Send } from 'lucide-react';
import { useChats } from '@/hooks/useChats';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatsListScreenProps {
  onStartChat: (matchData: {
    matchId: string;
    matchedUserId: string;
    matchedUserName: string;
    matchedUserVibes: string;
  }) => void;
}

const ChatsListScreen = ({ onStartChat }: ChatsListScreenProps) => {
  const { chats, loading, refetch } = useChats();
  const navigate = useNavigate();
  const [messageInputs, setMessageInputs] = useState<{ [key: string]: string }>({});
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Get current user
  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Add effect to refetch when component mounts
  React.useEffect(() => {
    console.log('ChatsListScreen mounted, refetching chats');
    refetch();
  }, []); // Remove refetch from dependencies to prevent infinite loop

  // Also refetch when the component becomes visible (tab switching)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('ChatsListScreen became visible, refetching chats');
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Remove refetch from dependencies to prevent infinite loop

  const handleSendMessage = async (chatId: string, receiverId: string, message: string) => {
    if (!message.trim() || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          match_id: chatId,
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: message.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      // Clear the input for this specific chat
      setMessageInputs(prev => ({ ...prev, [chatId]: '' }));
      toast.success('Message sent!');
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleInputChange = (chatId: string, value: string) => {
    setMessageInputs(prev => ({ ...prev, [chatId]: value }));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 pb-20">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">Your Chats</h1>
          <p className="text-gray-600">Loading your conversations...</p>
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
        <h1 className="text-lg font-bold text-gray-800">Your Chats</h1>
        <p className="text-sm text-gray-600">{chats.length} active conversations</p>
      </div>

      <div className="space-y-3">
        {chats.map((chat) => (
          <Card 
            key={chat.id} 
            className="p-4 space-y-3 bg-gray-50 border-gray-200 animate-fade-in hover:bg-lavender transition-colors"
          >
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-rose-100">
                  <img 
                    src={chat.mainPhoto} 
                    alt={chat.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{chat.name}</h3>
                  {chat.age && (
                    <p className="text-xs text-gray-600">{chat.age} years</p>
                  )}
                  <div className="flex items-center space-x-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(chat.lastInteractionAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <MessageCircle className="w-5 h-5 text-rose-500 mb-1" />
                <div className="text-xs text-gray-500">Active</div>
              </div>
            </div>

            {/* Current Mood */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Current Mood</h4>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full"></div>
                <span className="text-sm text-gray-600 capitalize">{chat.mood}</span>
              </div>
            </div>

            {/* Vibes Section */}
            {chat.memes.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Their Vibes</h4>
                <div className="flex flex-wrap gap-2">
                  {chat.memes.slice(0, 3).map((meme, index) => (
                    <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg">
                      <div className="text-xs">{meme.emoji}</div>
                      <span className="text-xs font-medium text-gray-700">{meme.title}</span>
                    </div>
                  ))}
                  {chat.memes.length > 3 && (
                    <div className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg">
                      <span className="text-xs text-gray-600">+{chat.memes.length - 3} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/chat/${chat.id}`);
                }}
              >
                <User className="w-4 h-4 mr-1" />
                View Profile
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  const vibesText = chat.memes.map((m: any) => m.title).join(' • ');
                  onStartChat({
                    matchId: chat.id,
                    matchedUserId: chat.userId,
                    matchedUserName: chat.name,
                    matchedUserVibes: vibesText || chat.mood
                  });
                }}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Continue Chat
              </Button>
            </div>

            {/* Message Input Section - At Bottom */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex space-x-2">
                <Input
                  value={messageInputs[chat.id] || ''}
                  onChange={(e) => handleInputChange(chat.id, e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border-gray-300 focus:border-rose-400 focus:ring-rose-200 h-9 text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage(chat.id, chat.userId, messageInputs[chat.id] || '');
                    }
                  }}
                />
                <Button
                  onClick={() => handleSendMessage(chat.id, chat.userId, messageInputs[chat.id] || '')}
                  disabled={!messageInputs[chat.id]?.trim()}
                  className="rounded-full bg-rose-500 hover:bg-rose-600 text-white p-2 disabled:bg-gray-300 h-9 w-9"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {chats.length === 0 && (
        <Card className="p-6 text-center space-y-3 bg-gray-50">
          <MessageCircle className="w-8 h-8 mx-auto text-gray-400" />
          <div>
            <p className="text-sm text-gray-600 font-medium">No active chats yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Accept chat requests from the matches screen to start your first conversation!
            </p>
          </div>
        </Card>
      )}

    </div>
  );
};

export default ChatsListScreen;