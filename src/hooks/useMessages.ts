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

  // Send a new message with validation
  const sendMessage = async (content: string, receiverId: string) => {
    const trimmedContent = content.trim();
    
    // Validate message content
    if (!trimmedContent || !matchId || !currentUserId) return false;
    
    // Enforce 5000 character limit (matching database constraint)
    if (trimmedContent.length > 5000) {
      toast({
        title: "Message too long",
        description: "Messages must be 5000 characters or less",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: trimmedContent
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
    if (!matchId || !currentUserId) return;

    fetchMessages();

    const channel = supabase
      .channel(`messages-realtime:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          console.log('Realtime message INSERT received:', payload);
          const newMessage = payload.new as Message;
          
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              console.log('Duplicate message ignored:', newMessage.id);
              return prev;
            }
            console.log('Adding new message to state:', newMessage.id);
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          console.log('Realtime message UPDATE received:', payload);
          const updatedMessage = payload.new as Message;
          setMessages(prev => 
            prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          console.log('Realtime message DELETE received:', payload);
          const deletedMessage = payload.old as Message;
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id));
          
          // Recalculate counts
          setMessageCounts(prev => ({
            total: Math.max(0, prev.total - 1),
            fromCurrentUser: deletedMessage.sender_id === currentUserId 
              ? Math.max(0, prev.fromCurrentUser - 1)
              : prev.fromCurrentUser,
            fromOtherUser: deletedMessage.sender_id !== currentUserId 
              ? Math.max(0, prev.fromOtherUser - 1)
              : prev.fromOtherUser
          }));
        }
      )
      .subscribe((status, err) => {
        console.log('Messages realtime subscription status:', status);
        if (err) {
          console.error('Messages realtime subscription error:', err);
        }
      });

    return () => {
      console.log('Cleaning up messages realtime subscription');
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