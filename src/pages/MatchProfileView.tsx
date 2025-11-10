import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileInfo from '@/components/profile/ProfileInfo';
import PhotoGallery from '@/components/profile/PhotoGallery';
import MatchedUserDescriptionSection from '@/components/profile/MatchedUserDescriptionSection';
import PhotoGalleryViewer from '@/components/profile/PhotoGalleryViewer';
import { useMessages } from '@/hooks/useMessages';
import { useUserPhotos } from '@/hooks/useUserPhotos';

const MatchProfileView = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [matchedUserProfile, setMatchedUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  const { messages } = useMessages(matchId || '', currentUserId || '');
  const canViewPhotos = messages.length >= 60;
  const { photos } = useUserPhotos(matchedUserProfile?.id);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchMatchedUserProfile = async () => {
      if (!matchId || !currentUserId) return;

      try {
        // First get the match to find the other user
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (matchError) throw matchError;

        // Determine which user is the matched user (not current user)
        const matchedUserId = match.user_1 === currentUserId ? match.user_2 : match.user_1;

        // Get the matched user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', matchedUserId)
          .single();

        if (profileError) throw profileError;

        setMatchedUserProfile(profile);
      } catch (error) {
        console.error('Error fetching matched user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchedUserProfile();
  }, [matchId, currentUserId]);

  const handleBack = () => {
    navigate('/', { state: { screen: 'matches' } });
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
            Back to Matches
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

          <ProfileHeader 
            userProfile={matchedUserProfile} 
            isMatchedUser={true} 
            canViewPhotos={canViewPhotos}
            onPhotoClick={() => setIsGalleryOpen(true)}
          />
          <ProfileInfo userProfile={matchedUserProfile} isMatchedUser={true} matchedUserId={matchedUserProfile.id} />
          <MatchedUserDescriptionSection userId={matchedUserProfile.id} />
          <PhotoGallery userId={matchedUserProfile.id} canViewPhotos={canViewPhotos} isMatchedUser={true} />
          
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
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        canViewPhotos={canViewPhotos}
      />
    </div>
  );
};

export default MatchProfileView;