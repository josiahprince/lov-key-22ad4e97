import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MessageCircle, Clock, UserMinus } from 'lucide-react';
import { useChats } from '@/hooks/useChats';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ScreenHeader from '@/components/ScreenHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import InitialsAvatar from '@/components/InitialsAvatar';
import { MAX_ACTIVE_CHATS, CHAT_INACTIVITY_HOURS } from '@/lib/constants';

interface ChatsListScreenProps {
  onStartChat: (matchData: {
    matchId: string;
    matchedUserId: string;
    matchedUserName: string;
    matchedUserVibes: string;
    matchedUserPhoto?: string | null;
  }) => void;
}

const ChatsListScreen = ({ onStartChat }: ChatsListScreenProps) => {
  const { chats, loading, refetch } = useChats();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!pendingRemove) return;
    setRemoving(true);
    const { error } = await supabase.rpc('remove_match', { p_match_id: pendingRemove.id });
    setRemoving(false);
    if (error) {
      logError(`ChatsListScreen:removeMatch:${pendingRemove.id}`, error);
      toast({
        title: 'Error',
        description: 'Failed to remove this match. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: `${pendingRemove.name} removed` });
    setPendingRemove(null);
    refetch();
  };
  
  // useChats already fetches on mount and keeps chats in sync via its
  // realtime subscription, so no extra mount/visibility-triggered refetch
  // is needed here.

  if (loading) {
    return (
      <div className="p-6 space-y-6 pb-32">
        <ScreenHeader title="Your Chats" subtitle="Loading your conversations..." />
        <LoadingState variant="skeleton" shape="list-item" rows={3} />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4 pb-20">
      <ScreenHeader title="Your Chats" subtitle={`${chats.length} of ${MAX_ACTIVE_CHATS} active conversations`} />

      <p className="text-xs text-muted-foreground">
        A chat closes for both of you if either person goes {CHAT_INACTIVITY_HOURS} hours without sending a message.
        {chats.length >= MAX_ACTIVE_CHATS && ` New matches are paused while you have ${MAX_ACTIVE_CHATS} active chats.`}
      </p>

      <div className="space-y-3">
        {chats.map((chat) => (
          <Card
            key={chat.id}
            role="button"
            tabIndex={0}
            aria-label={`View ${chat.name}'s profile`}
            onClick={() => navigate(`/chat/${chat.id}`)}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                navigate(`/chat/${chat.id}`);
              }
            }}
            className="p-4 space-y-3 bg-muted/50 border-border animate-fade-in hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 shrink-0">
                  <InitialsAvatar src={chat.mainPhoto} name={chat.name} />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{chat.name}</h3>
                  {chat.age && (
                    <p className="text-xs text-muted-foreground">{chat.age} years</p>
                  )}
                  <div className="flex items-center space-x-1 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(chat.lastInteractionAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <MessageCircle className="w-5 h-5 text-primary mb-1" />
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>

            {/* Current Mood */}
            <div>
              <h4 className="text-xs font-medium text-foreground/80 mb-1">Current Mood</h4>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground capitalize">{chat.mood}</span>
              </div>
            </div>

            {/* Vibes Section */}
            {chat.memes.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-foreground/80 mb-2">Their Vibes</h4>
                <div className="flex flex-wrap gap-2">
                  {chat.memes.slice(0, 3).map((meme, index) => (
                    <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-accent border border-primary/20 rounded-lg">
                      <div className="text-xs">{meme.emoji}</div>
                      <span className="text-xs font-medium text-accent-foreground">{meme.title}</span>
                    </div>
                  ))}
                  {chat.memes.length > 3 && (
                    <div className="px-2 py-1 bg-muted border border-border rounded-lg">
                      <span className="text-xs text-muted-foreground">+{chat.memes.length - 3} more</span>
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
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingRemove({ id: chat.id, name: chat.name });
                }}
              >
                <UserMinus className="w-4 h-4 mr-1" />
                Remove User
              </Button>
              <Button
                size="sm"
                className="flex-1 rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  const vibesText = chat.memes.map((m) => m.title).join(' • ');
                  onStartChat({
                    matchId: chat.id,
                    matchedUserId: chat.userId,
                    matchedUserName: chat.name,
                    matchedUserVibes: vibesText || chat.mood,
                    matchedUserPhoto: chat.mainPhoto,
                  });
                }}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Continue Chat
              </Button>
            </div>

          </Card>
        ))}
      </div>

      <AlertDialog open={!!pendingRemove} onOpenChange={(open) => !open && !removing && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your chat ends for both of you and you won't be matched again. They won't be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
            >
              {removing ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {chats.length === 0 && (
        <EmptyState
          icon={MessageCircle}
          title="No active chats yet"
          description="Accept chat requests from the matches screen to start your first conversation!"
        />
      )}

    </div>
  );
};

export default ChatsListScreen;
