import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface MessageCounts {
  total: number;
  fromCurrentUser: number;
  fromOtherUser: number;
}

export const useMessages = (matchId: string, currentUserId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageCounts, setMessageCounts] = useState<MessageCounts>({
    total: 0,
    fromCurrentUser: 0,
    fromOtherUser: 0
  });
  const { toast } = useToast();

  // Fetch messages for the match
  const fetchMessages = async () => {
    if (!matchId || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      
      // Calculate message counts
      const total = data?.length || 0;
      const fromCurrentUser = data?.filter(msg => msg.sender_id === currentUserId).length || 0;
      const fromOtherUser = total - fromCurrentUser;
      
      setMessageCounts({
        total,
        fromCurrentUser,
        fromOtherUser
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async (content: string, receiverId: string) => {
    if (!content.trim() || !matchId || !currentUserId) return false;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: content.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new message to local state
      setMessages(prev => [...prev, data]);
      
      // Update message counts
      setMessageCounts(prev => ({
        total: prev.total + 1,
        fromCurrentUser: prev.fromCurrentUser + 1,
        fromOtherUser: prev.fromOtherUser
      }));

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return false;
    }
  };

  // Check if photos should be unblurred (10+ total messages with at least 5 from each user)
  const canViewPhotos = () => {
    return messageCounts.total >= 10 && 
           messageCounts.fromCurrentUser >= 5 && 
           messageCounts.fromOtherUser >= 5;
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!matchId) return;

    fetchMessages();

    const channel = supabase
      .channel(`messages-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          
          // Update counts for real-time messages
          setMessageCounts(prev => ({
            total: prev.total + 1,
            fromCurrentUser: newMessage.sender_id === currentUserId 
              ? prev.fromCurrentUser + 1 
              : prev.fromCurrentUser,
            fromOtherUser: newMessage.sender_id !== currentUserId 
              ? prev.fromOtherUser + 1 
              : prev.fromOtherUser
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, currentUserId]);

  return {
    messages,
    loading,
    messageCounts,
    sendMessage,
    canViewPhotos,
    fetchMessages
  };
};