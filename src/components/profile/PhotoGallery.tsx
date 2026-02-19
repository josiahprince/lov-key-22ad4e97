import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Star, Upload, Link, GripVertical } from 'lucide-react';
import { useUserPhotos } from '@/hooks/useUserPhotos';
import { useSecurePhotos } from '@/hooks/useSecurePhotos';

interface PhotoGalleryProps {
  userId?: string;
  canViewPhotos?: boolean;
  isMatchedUser?: boolean;
  matchId?: string;
  onPhotoClick?: (photoIndex: number) => void;
}

const PhotoGallery = ({ userId, canViewPhotos = true, isMatchedUser = false, matchId, onPhotoClick }: PhotoGalleryProps) => {
  const { photos: userPhotos, loading: userLoading, uploadPhoto, addPhotoFromUrl, removePhoto, setMainPhoto, swapPhotoSlots } = useUserPhotos(isMatchedUser ? undefined : userId);
  const { photos: securePhotos, loading: secureLoading, canViewUnblurred, refetch: refetchSecurePhotos, clearCache } = useSecurePhotos({
    userId,
    matchId,
    isOwnProfile: !isMatchedUser
  });

  const photos = isMatchedUser
    ? securePhotos
    : userPhotos.map(up => {
        const secure = securePhotos.find(sp => sp.photo_slot === up.photo_slot);
        return secure ? { ...up, signedUrl: secure.signedUrl, canViewUnblurred: true } : up;
      });

  const loading = isMatchedUser ? secureLoading : userLoading;
  const effectiveCanView = isMatchedUser ? (canViewPhotos && canViewUnblurred) : canViewPhotos;

  const [showSocialOptions, setShowSocialOptions] = useState<number | null>(null);
  const [socialUrl, setSocialUrl] = useState('');
  const [uploading, setUploading] = useState<number | null>(null);

  // Drag-and-drop state
  const dragSlotRef = useRef<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [isDraggingSlot, setIsDraggingSlot] = useState<number | null>(null);

  const refreshSecurePhotos = () => {
    if (userId) clearCache(userId);
    refetchSecurePhotos();
  };

  // Drag handlers
  const handleDragStart = (slot: number) => {
    dragSlotRef.current = slot;
    setIsDraggingSlot(slot);
  };

  const handleDragOver = (e: React.DragEvent, slot: number) => {
    e.preventDefault();
    setDragOverSlot(slot);
  };

  const handleDrop = async (e: React.DragEvent, targetSlot: number) => {
    e.preventDefault();
    const sourceSlot = dragSlotRef.current;
    setDragOverSlot(null);
    setIsDraggingSlot(null);
    dragSlotRef.current = null;
    if (sourceSlot === null || sourceSlot === targetSlot) return;
    await swapPhotoSlots(sourceSlot, targetSlot);
    refreshSecurePhotos();
  };

  const handleDragEnd = () => {
    setDragOverSlot(null);
    setIsDraggingSlot(null);
    dragSlotRef.current = null;
  };

  const handleFileUpload = async (slot: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(slot);
    const result = await uploadPhoto(file, slot);
    setUploading(null);
    event.target.value = '';
    if (result) refreshSecurePhotos();
  };

  const triggerFileInput = (slot: number) => {
    const fileInput = document.getElementById(`file-input-${slot}`) as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  const handleSocialUpload = async (slot: number) => {
    if (socialUrl.trim()) {
      try {
        new URL(socialUrl);
        await addPhotoFromUrl(socialUrl, slot);
        setSocialUrl('');
        setShowSocialOptions(null);
        refreshSecurePhotos();
      } catch {
        alert('Please enter a valid URL');
      }
    }
  };

  const mainPhoto = photos.find(p => p.is_main && (p.signedUrl || p.photo_url)) || photos.find(p => p.signedUrl || p.photo_url);
  const mainPhotoUrl = mainPhoto?.signedUrl || mainPhoto?.photo_url;
  const otherPhotos = isMatchedUser
    ? photos.filter(p => !p.is_main && (p.signedUrl || p.photo_url))
    : photos.filter(p => !p.is_main || !(p.signedUrl || p.photo_url));

  if (loading) {
    return (
      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-gray-700">Photo Gallery</h3>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading photos...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-medium text-gray-700">Photo Gallery</h3>

      {/* Hidden file inputs */}
      {!isMatchedUser && photos.map((photo) => (
        <input
          key={photo.photo_slot}
          id={`file-input-${photo.photo_slot}`}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.ico"
          onChange={(e) => handleFileUpload(photo.photo_slot, e)}
          className="hidden"
        />
      ))}

      {!isMatchedUser ? (
        /* ── Own profile: unified draggable grid ── */
        <div className="space-y-3">
          {photos.some(p => p.photo_url || p.signedUrl) && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <GripVertical className="w-3 h-3" /> Drag photos to reorder
            </p>
          )}

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Photos (drag to reorder)</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo) => {
                const hasPhoto = !!(photo.signedUrl || photo.photo_url);
                const displayUrl = photo.signedUrl || photo.photo_url;
                const isActive = isDraggingSlot === photo.photo_slot;
                const isOver = dragOverSlot === photo.photo_slot && isDraggingSlot !== photo.photo_slot;

                return (
                  <div
                    key={photo.photo_slot}
                    className="relative"
                    onDragOver={(e) => handleDragOver(e, photo.photo_slot)}
                    onDrop={(e) => handleDrop(e, photo.photo_slot)}
                    onDragLeave={() => setDragOverSlot(null)}
                  >
                    {hasPhoto ? (
                      <div
                        draggable
                        onDragStart={() => handleDragStart(photo.photo_slot)}
                        onDragEnd={handleDragEnd}
                        className={[
                          'relative w-full aspect-square bg-gray-100 rounded-lg border-2 transition-all duration-150 group cursor-grab active:cursor-grabbing select-none',
                          isActive ? 'opacity-40 scale-95 border-rose-400' : '',
                          isOver ? 'border-rose-500 ring-2 ring-rose-300 scale-105' : (!isActive ? 'border-gray-200 hover:border-rose-300' : ''),
                        ].join(' ')}
                        onClick={() => {
                          if (isDraggingSlot !== null) return;
                          if (onPhotoClick) {
                            const idx = photos.findIndex(p => p.photo_slot === photo.photo_slot);
                            if (idx !== -1) onPhotoClick(idx);
                          }
                        }}
                      >
                        {/* Drag grip */}
                        <div className="absolute top-1 left-1 z-20 opacity-0 group-hover:opacity-80 transition-opacity pointer-events-none">
                          <GripVertical className="w-3 h-3 text-white drop-shadow-md" />
                        </div>

                        {/* Main badge */}
                        {photo.is_main && (
                          <div className="absolute bottom-1 left-1 z-20 bg-yellow-400 rounded-full px-1.5 py-0.5 flex items-center gap-0.5 pointer-events-none">
                            <Star className="w-2.5 h-2.5 text-white" />
                            <span className="text-white text-[9px] font-bold">Main</span>
                          </div>
                        )}

                        <img
                          src={displayUrl}
                          alt={`Photo ${photo.photo_slot}`}
                          className="w-full h-full object-cover rounded-lg pointer-events-none"
                          draggable={false}
                        />

                        {/* Set as main — top left */}
                        {!photo.is_main && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="absolute -top-2 -left-2 w-6 h-6 p-0 bg-white border-yellow-300 hover:bg-yellow-50 z-20"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await setMainPhoto(photo.photo_slot);
                              refreshSecurePhotos();
                            }}
                            disabled={uploading === photo.photo_slot}
                            title="Set as main photo"
                          >
                            <Star className="w-3 h-3 text-yellow-500" />
                          </Button>
                        )}

                        {/* Delete — top right */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500 z-20"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await removePhoto(photo.photo_slot);
                            refreshSecurePhotos();
                          }}
                          disabled={uploading === photo.photo_slot}
                          title="Remove photo"
                        >
                          ×
                        </Button>

                        {/* Replace overlay on hover */}
                        {!uploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white hover:bg-gray-100 text-black border-gray-300 text-xs px-2"
                              onClick={(e) => { e.stopPropagation(); triggerFileInput(photo.photo_slot); }}
                            >
                              <Upload className="w-2 h-2 mr-1" />
                              Replace
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty slot */
                      <div
                        className={[
                          'relative w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed transition-all duration-150 group',
                          isOver ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-300 scale-105' : 'border-gray-300 hover:border-rose-300',
                        ].join(' ')}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          {uploading === photo.photo_slot ? (
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-500 mx-auto mb-1"></div>
                              <span className="text-xs text-gray-500">Uploading…</span>
                            </div>
                          ) : isOver ? (
                            <div className="text-center">
                              <Plus className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                              <span className="text-xs text-rose-500">Drop here</span>
                            </div>
                          ) : (
                            <Plus className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

                        {!uploading && !isOver && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <div className="flex flex-col space-y-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white hover:bg-gray-100 text-black border-gray-300 text-xs px-2"
                                onClick={() => triggerFileInput(photo.photo_slot)}
                              >
                                <Upload className="w-2 h-2 mr-1" />
                                Upload
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white hover:bg-gray-100 text-black border-gray-300 text-xs px-2"
                                onClick={() => setShowSocialOptions(photo.photo_slot)}
                              >
                                <Link className="w-2 h-2 mr-1" />
                                URL
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Social URL input */}
                    {showSocialOptions === photo.photo_slot && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white p-2 rounded-lg shadow-lg border">
                        <div className="flex flex-col space-y-2">
                          <Input
                            placeholder="Image URL..."
                            value={socialUrl}
                            onChange={(e) => setSocialUrl(e.target.value)}
                            className="text-xs"
                          />
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              onClick={() => handleSocialUpload(photo.photo_slot)}
                              className="bg-rose-500 hover:bg-rose-600 text-white text-xs flex-1"
                            >
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowSocialOptions(null)}
                              className="text-xs flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Matched user: read-only view ── */
        <>
          {mainPhotoUrl && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-600">Main Profile Photo</span>
              </div>
              <div
                className="relative w-32 h-32 bg-gray-100 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-rose-300 transition-colors"
                onClick={() => {
                  if (onPhotoClick) {
                    const idx = photos.findIndex(p => (p.signedUrl || p.photo_url) === mainPhotoUrl);
                    if (idx !== -1) onPhotoClick(idx);
                  }
                }}
              >
                <img
                  src={mainPhotoUrl}
                  alt="Main profile"
                  className={`w-full h-full object-cover rounded-lg ${!effectiveCanView ? 'filter blur-md' : ''}`}
                />
              </div>
            </div>
          )}

          {otherPhotos.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-600 block mb-2">Additional Photos</span>
              <div className="grid grid-cols-3 gap-3">
                {otherPhotos.map((photo) => (
                  <div
                    key={photo.photo_slot}
                    className="relative w-20 h-20 bg-gray-100 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-rose-300 transition-colors"
                    onClick={() => {
                      if (onPhotoClick) {
                        const idx = photos.findIndex(p => p.photo_slot === photo.photo_slot);
                        if (idx !== -1) onPhotoClick(idx);
                      }
                    }}
                  >
                    <img
                      src={photo.signedUrl || photo.photo_url}
                      alt={`Photo ${photo.photo_slot}`}
                      className={`w-full h-full object-cover rounded-lg ${!effectiveCanView ? 'filter blur-md' : ''}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default PhotoGallery;
