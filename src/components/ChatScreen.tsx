import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { groupMessagesIntoChatItems } from '@/lib/chatGrouping';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Send, Images, MoreVertical } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { useBlockUser } from '@/hooks/useBlockUser';
import { usePhotoReveal } from '@/hooks/usePhotoReveal';
import type { PhotoRevealChoice } from '@/lib/constants';
import BlockReportModal from '@/components/BlockReportModal';
import ScreenHeader from '@/components/ScreenHeader';
import PhotoUnlockNotice from '@/components/PhotoUnlockNotice';
import PhotoRevealPrompt from '@/components/PhotoRevealPrompt';
import LoadingState from '@/components/LoadingState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface ChatScreenProps {
  matchId: string;
  matchedUserId: string;
  matchedUserName: string;
  matchedUserVibes: string;
  matchedUserPhoto?: string | null;
  onBackToChats?: () => void;
  onViewPhotos?: () => void;
}

const ChatScreen = ({ matchId, matchedUserId, matchedUserName, matchedUserVibes, matchedUserPhoto, onBackToChats, onViewPhotos }: ChatScreenProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const [newMessage, setNewMessage] = useState('');
  const [canSend, setCanSend] = useState(true);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, loading, messageCounts, sendMessage } = useMessages(matchId, currentUserId);
  const { blockUser, blocking } = useBlockUser();
  const {
    round,
    threshold,
    revealed,
    submitting: submittingChoice,
    awaitingMyChoice,
    awaitingPartner,
    submitChoice,
  } = usePhotoReveal(matchId, messageCounts.total);

  const chatItems = useMemo(
    () => groupMessagesIntoChatItems(messages, currentUserId),
    [messages, currentUserId]
  );

  const handleConfirmBlock = async () => {
    const success = await blockUser(matchedUserId);
    setIsBlockConfirmOpen(false);
    if (success) onBackToChats?.();
  };

  // Auto-scroll to bottom only when a message is actually added - the
  // periodic poll re-fetches and replaces the whole array every few
  // seconds even when nothing changed, which would otherwise yank the
  // view back to the bottom while someone is reading older messages.
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const previousMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      scrollToBottom();
    }
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !canSend || loading) return;
    
    setCanSend(false);
    const success = await sendMessage(newMessage, matchedUserId);
    
    if (success) {
      setNewMessage('');
      // Add a delay before allowing next message
      setTimeout(() => setCanSend(true), 10000);
    } else {
      setCanSend(true);
    }
  };

  const handleRevealChoice = async (choice: PhotoRevealChoice) => {
    const result = await submitChoice(choice);
    // Both sides agreed, so this tap is what unlocked the photos - take them
    // straight there rather than making them hunt for the button.
    if (result?.revealed) {
      onViewPhotos?.();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header - More compact */}
      <div className="p-3 bg-white border-b border-border">
        <ScreenHeader
          onBack={onBackToChats}
          avatar={{ src: matchedUserPhoto ?? undefined, alt: matchedUserName, blurred: !revealed }}
          title={matchedUserName}
          subtitle={matchedUserVibes}
          actions={
            <>
              {revealed && (
                <Button
                  onClick={onViewPhotos}
                  size="sm"
                  variant="outline"
                  className="text-primary border-primary/20 hover:bg-accent text-xs px-2 py-1"
                >
                  <Images className="w-3 h-3 mr-1" />
                  View Photos
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsBlockConfirmOpen(true)}>
                    Block
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsReportOpen(true)}>
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        {!revealed && !awaitingMyChoice && !awaitingPartner && (
          <PhotoUnlockNotice messageCount={messageCounts.total} round={round} className="mt-2" />
        )}
      </div>

      {/* Messages - Takes remaining space */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            {loading ? (
              <LoadingState variant="skeleton" shape="message" />
            ) : (
              <>
                {chatItems.map((item) => {
                  if (item.type === 'date') {
                    return (
                      <div key={item.id} className="flex justify-center my-1">
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {item.label}
                        </span>
                      </div>
                    );
                  }

                  const { isOwn, messages: groupMessages } = item;
                  const lastMessage = groupMessages[groupMessages.length - 1];

                  return (
                    <div
                      key={item.id}
                      className={`flex items-end gap-2 mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwn && (
                        <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-border">
                          <img
                            src={matchedUserPhoto ?? undefined}
                            alt={matchedUserName}
                            className={`w-full h-full object-cover ${!revealed ? 'filter blur-sm' : ''}`}
                          />
                        </div>
                      )}

                      <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        <span className="text-[11px] font-medium text-muted-foreground px-1 mb-0.5">
                          {isOwn ? 'You' : matchedUserName}
                        </span>

                        {groupMessages.map((message, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === groupMessages.length - 1;
                          const roundedCorner = isOwn
                            ? `rounded-2xl ${isFirst ? 'rounded-tr-2xl' : 'rounded-tr-sm'} ${isLast ? 'rounded-br-sm' : 'rounded-br-2xl'}`
                            : `rounded-2xl ${isFirst ? 'rounded-tl-2xl' : 'rounded-tl-sm'} ${isLast ? 'rounded-bl-sm' : 'rounded-bl-2xl'}`;

                          return (
                            <div
                              key={message.id}
                              className={`px-3 py-2 text-sm break-words ${idx > 0 ? 'mt-0.5' : ''} ${roundedCorner} ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              {message.content}
                            </div>
                          );
                        })}

                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                          {format(new Date(lastMessage.created_at), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {!canSend && (
                  <div className="text-center py-4">
                    <Card className="inline-flex items-center space-x-2 p-2 bg-accent border-primary/20">
                      <Clock className="w-3 h-3 text-primary" />
                      <span className="text-xs text-accent-foreground">
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

      {/* Message Input - anchored to bottom, below the message list */}
      <div className="p-4 bg-white border-t border-border shadow-sm">
        {(awaitingMyChoice || awaitingPartner) && (
          <PhotoRevealPrompt
            matchedUserName={matchedUserName}
            threshold={threshold}
            waitingForPartner={awaitingPartner}
            submitting={submittingChoice}
            onChoose={handleRevealChoice}
            className="mb-3"
          />
        )}

        <div className="flex space-x-3 items-center">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={canSend ? "Type your message..." : "Wait a moment before sending..."}
            disabled={!canSend}
            className="flex-1 rounded-xl h-11 text-sm px-4"
            onKeyPress={(e) => e.key === 'Enter' && canSend && newMessage.trim() && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!canSend || !newMessage.trim()}
            className="rounded-xl px-4 py-2 h-11 min-w-[50px] transition-colors"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {!canSend && (
          <div className="mt-2 text-center">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              ⏱️ Next message unlocks in a few seconds
            </span>
          </div>
        )}
      </div>

      <AlertDialog open={isBlockConfirmOpen} onOpenChange={setIsBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {matchedUserName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to contact you again, and you won't be matched with them in the future.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBlock} disabled={blocking}>
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BlockReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetUserId={matchedUserId}
        targetUserName={matchedUserName}
        matchId={matchId}
        onSubmitted={(blocked) => {
          if (blocked) onBackToChats?.();
        }}
      />
    </div>
  );
};

export default ChatScreen;
