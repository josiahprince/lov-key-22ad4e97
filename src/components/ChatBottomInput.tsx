import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useChats } from '@/hooks/useChats';

const ChatBottomInput = () => {
  const [message, setMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<string>('');
  const { chats, refetch } = useChats();

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

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUserId || !selectedChat) return;

    const chatToSend = chats.find(chat => chat.id === selectedChat);
    if (!chatToSend) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          match_id: selectedChat,
          sender_id: currentUserId,
          receiver_id: chatToSend.userId,
          content: message.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      setMessage('');
      setSelectedChat('');
      toast.success('Message sent!');
      refetch();
      
    } catch (error) {
      console.error('Error sending message:', error);  
      toast.error('Failed to send message');
    }
  };

  if (chats.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 p-4 shadow-lg">
      <div className="space-y-3">
        {/* Chat Selection */}
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-4 h-4 text-rose-500" />
          <select
            value={selectedChat}
            onChange={(e) => setSelectedChat(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-rose-400 focus:ring-rose-200 bg-white"
          >
            <option value="">Select someone to message...</option>
            {chats.map((chat) => (
              <option key={chat.id} value={chat.id}>
                {chat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Message Input */}
        <div className="flex space-x-2 items-center">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={selectedChat ? "Type your message..." : "Select a chat first"}
            disabled={!selectedChat}
            className="flex-1 rounded-full border-gray-300 focus:border-rose-400 focus:ring-rose-200 bg-white"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && message.trim() && selectedChat) {
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || !selectedChat}
            className="rounded-full bg-rose-500 hover:bg-rose-600 text-white p-2 disabled:bg-gray-300 w-10 h-10 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          Press Enter to send • Select a chat to start messaging
        </p>
      </div>
    </div>
  );
};

export default ChatBottomInput;