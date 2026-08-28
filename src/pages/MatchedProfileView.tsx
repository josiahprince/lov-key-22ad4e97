import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MoreVertical } from 'lucide-react';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileInfo from '@/components/profile/ProfileInfo';
import PhotoGallery from '@/components/profile/PhotoGallery';
import MatchedUserDescriptionSection from '@/components/profile/MatchedUserDescriptionSection';
import PhotoGalleryViewer from '@/components/profile/PhotoGalleryViewer';
import BlockReportModal from '@/components/BlockReportModal';
import { useMessages } from '@/hooks/useMessages';
import { useSecurePhotos } from '@/hooks/useSecurePhotos';
import { useMatchedUserProfile } from '@/hooks/useMatchedUserProfile';
import { useBlockUser } from '@/hooks/useBlockUser';
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

interface MatchedProfileViewProps {
  backTo: string;
  backLabel: string;
}

const MatchedProfileView = ({ backTo, backLabel }: MatchedProfileViewProps) => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const { matchedUserProfile, loading } = useMatchedUserProfile(matchId, user?.id);
  const { messages } = useMessages(matchId || '', user?.id || '');
  const { photos, canViewUnblurred: canViewPhotos } = useSecurePhotos({
    userId: matchedUserProfile?.id,
    matchId: matchId,
    isOwnProfile: false
  });
  const { blockUser, blocking } = useBlockUser();

  const handleBack = () => navigate(backTo);

  const handleConfirmBlock = async () => {
    if (!matchedUserProfile) return;
    const success = await blockUser(matchedUserProfile.id);
    setIsBlockConfirmOpen(false);
    if (success) navigate(backTo);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!matchedUserProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50">
      <div className="max-w-md mx-auto min-h-screen bg-white/80 backdrop-blur-sm shadow-xl">
        <div className="p-4 pb-20 space-y-6">
          {/* Header with Back button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleBack}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <h1 className="text-xl font-bold text-gray-800">Profile</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
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
          </div>

          <ProfileHeader
            userProfile={matchedUserProfile}
            isMatchedUser={true}
            canViewPhotos={canViewPhotos}
            matchId={matchId}
            onPhotoClick={() => {
              setSelectedPhotoIndex(0);
              setIsGalleryOpen(true);
            }}
          />
          <ProfileInfo userProfile={matchedUserProfile} isMatchedUser={true} matchedUserId={matchedUserProfile.id} />
          <MatchedUserDescriptionSection userId={matchedUserProfile.id} />
          <PhotoGallery
            userId={matchedUserProfile.id}
            canViewPhotos={canViewPhotos}
            isMatchedUser={true}
            matchId={matchId}
            onPhotoClick={(index) => {
              setSelectedPhotoIndex(index);
              setIsGalleryOpen(true);
            }}
          />

          {!canViewPhotos && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center">
              <p className="text-sm text-rose-700">
                Photos will be revealed after exchanging 60 messages
              </p>
              <p className="text-xs text-rose-600 mt-1">
                Current messages: {messages.length}/60
              </p>
            </div>
          )}
        </div>
      </div>

      <PhotoGalleryViewer
        photos={photos}
        initialIndex={selectedPhotoIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        canViewPhotos={canViewPhotos}
      />

      <AlertDialog open={isBlockConfirmOpen} onOpenChange={setIsBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {matchedUserProfile.nickname}?</AlertDialogTitle>
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
        targetUserId={matchedUserProfile.id}
        targetUserName={matchedUserProfile.nickname || 'this user'}
        matchId={matchId || null}
        onSubmitted={(blocked) => {
          if (blocked) navigate(backTo);
        }}
      />
    </div>
  );
};

export default MatchedProfileView;
