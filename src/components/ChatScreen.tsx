import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Send, Images, Eye, ArrowLeft } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';

interface ChatScreenProps {
  matchId: string;
  matchedUserId: string;
  matchedUserName: string;
  matchedUserVibes: string;
  onBackToChats?: () => void;
}

const ChatScreen = ({ matchId, matchedUserId, matchedUserName, matchedUserVibes, onBackToChats }: ChatScreenProps) => {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [canSend, setCanSend] = useState(true);
  const [photoRequestSent, setPhotoRequestSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const { messages, loading, messageCounts, sendMessage, canViewPhotos } = useMessages(matchId, currentUserId);


  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !canSend || loading) return;
    
    setCanSend(false);
    const success = await sendMessage(newMessage, matchedUserId);
    
    if (success) {
      setNewMessage('');
      // Add a delay before allowing next message
      setTimeout(() => setCanSend(true), 15000);
    } else {
      setCanSend(true);
    }
  };

  const handlePhotoRequest = async () => {
    setPhotoRequestSent(true);
    await sendMessage("Would you like to share more photos?", matchedUserId);
  };


  const canRequestPhotos = messageCounts.total >= 60;

  return (
    <div className="flex flex-col h-screen">
      {/* Header - More compact */}
      <div className="p-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {onBackToChats && (
              <Button
                onClick={onBackToChats}
                variant="ghost"
                size="sm"
                className="p-1 h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200">
                  <img 
                    src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=100&h=100&fit=crop&crop=face"
                    alt={matchedUserName}
                    className={`w-full h-full object-cover ${!canViewPhotos() ? 'filter blur-sm' : ''}`}
                  />
                </div>
                {!canViewPhotos() && (
                  <div className="absolute inset-0 w-8 h-8 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center opacity-80">
                    <span className="text-xs">📚</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 text-sm">{matchedUserName}</h2>
                <p className="text-xs text-gray-600">{matchedUserVibes}</p>
              </div>
            </div>
          </div>
          
          {canViewPhotos() && (
            <Button
              onClick={handlePhotoRequest}
              disabled={photoRequestSent}
              size="sm"
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs px-2 py-1"
            >
              <Images className="w-3 h-3 mr-1" />
              {photoRequestSent ? 'Requested' : 'View Photos'}
            </Button>
          )}
        </div>
        
        {!canViewPhotos() && (
          <div className="mt-2 p-2 bg-yellow-50 rounded-lg">
            <p className="text-xs text-yellow-700">
              <Eye className="w-3 h-3 inline mr-1" />
              Photos will be revealed after 60 total messages with at least 30 from each person. 
              Current: {messageCounts.total} total ({messageCounts.fromCurrentUser} from you, {messageCounts.fromOtherUser} from them)
            </p>
          </div>
        )}
      </div>

      {/* Messages - Takes remaining space */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading messages...</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'} mb-3`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-xl text-sm ${
                        message.sender_id === currentUserId
                          ? 'bg-rose-500 text-white rounded-br-sm'
                          : 'bg-blue-100 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                    </div>
                  </div>
                ))}
                
                {!canSend && (
                  <div className="text-center py-4">
                    <Card className="inline-flex items-center space-x-2 p-2 bg-yellow-50 border-yellow-200">
                      <Clock className="w-3 h-3 text-yellow-600" />
                      <span className="text-xs text-yellow-700">
                        Take your time... next message unlocks soon
                      </span>
                    </Card>
                  </div>
                )}
                
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="p-4 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex space-x-3 items-center">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={canSend ? "Type your message..." : "Wait a moment before sending..."}
            disabled={!canSend}
            className="flex-1 rounded-xl border-gray-300 focus:border-rose-400 focus:ring-rose-200 h-11 text-sm px-4 disabled:bg-gray-100"
            onKeyPress={(e) => e.key === 'Enter' && canSend && newMessage.trim() && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!canSend || !newMessage.trim()}
            className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 disabled:bg-gray-300 h-11 min-w-[50px] transition-colors"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {!canSend && (
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              ⏱️ Next message unlocks in a few seconds
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatScreen;
