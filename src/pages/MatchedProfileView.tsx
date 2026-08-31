import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import GradientShell from '@/components/GradientShell';
import ScreenHeader from '@/components/ScreenHeader';
import LoadingState from '@/components/LoadingState';
import PhotoUnlockNotice from '@/components/PhotoUnlockNotice';
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
      <GradientShell centered>
        <LoadingState variant="skeleton" shape="avatar-text" />
      </GradientShell>
    );
  }

  if (!matchedUserProfile) {
    return (
      <GradientShell centered>
        <div className="text-center">
          <p className="text-muted-foreground">Profile not found</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        </div>
      </GradientShell>
    );
  }

  return (
    <GradientShell withCard>
        <div className="p-4 pb-20 space-y-6">
          {/* Header with Back button */}
          <ScreenHeader
            onBack={handleBack}
            backLabel={backLabel}
            title="Profile"
            actions={
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
            }
          />

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
            <PhotoUnlockNotice current={messages.length} variant="card" />
          )}
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
    </GradientShell>
  );
};

export default MatchedProfileView;
