import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Send, Images, MoreVertical } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { useBlockUser } from '@/hooks/useBlockUser';
import BlockReportModal from '@/components/BlockReportModal';
import ScreenHeader from '@/components/ScreenHeader';
import PhotoUnlockNotice from '@/components/PhotoUnlockNotice';
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
}

const ChatScreen = ({ matchId, matchedUserId, matchedUserName, matchedUserVibes, matchedUserPhoto, onBackToChats }: ChatScreenProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const [newMessage, setNewMessage] = useState('');
  const [canSend, setCanSend] = useState(true);
  const [photoRequestSent, setPhotoRequestSent] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, loading, messageCounts, sendMessage, canViewPhotos } = useMessages(matchId, currentUserId);
  const { blockUser, blocking } = useBlockUser();

  const handleConfirmBlock = async () => {
    const success = await blockUser(matchedUserId);
    setIsBlockConfirmOpen(false);
    if (success) onBackToChats?.();
  };

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
      setTimeout(() => setCanSend(true), 10000);
    } else {
      setCanSend(true);
    }
  };

  const handlePhotoRequest = async () => {
    setPhotoRequestSent(true);
    await sendMessage("Would you like to share more photos?", matchedUserId);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header - More compact */}
      <div className="p-3 bg-white border-b border-border">
        <ScreenHeader
          onBack={onBackToChats}
          avatar={{ src: matchedUserPhoto ?? undefined, alt: matchedUserName, blurred: !canViewPhotos() }}
          title={matchedUserName}
          subtitle={matchedUserVibes}
          actions={
            <>
              {canViewPhotos() && (
                <Button
                  onClick={handlePhotoRequest}
                  disabled={photoRequestSent}
                  size="sm"
                  variant="outline"
                  className="text-primary border-primary/20 hover:bg-accent text-xs px-2 py-1"
                >
                  <Images className="w-3 h-3 mr-1" />
                  {photoRequestSent ? 'Requested' : 'View Photos'}
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

        {!canViewPhotos() && (
          <PhotoUnlockNotice current={messageCounts.total} className="mt-2" />
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
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'} mb-3`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-xl text-sm ${
                        message.sender_id === currentUserId
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                    </div>
                  </div>
                ))}

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
