
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Star, Upload, Link } from 'lucide-react';
import { useUserPhotos } from '@/hooks/useUserPhotos';

interface PhotoGalleryProps {
  userId?: string;
  canViewPhotos?: boolean; // Whether photos should be blurred or not
  isMatchedUser?: boolean; // Whether this is a matched user's profile (disables editing)
  onPhotoClick?: (photoIndex: number) => void; // Callback when a photo is clicked
}

const PhotoGallery = ({ userId, canViewPhotos = true, isMatchedUser = false, onPhotoClick }: PhotoGalleryProps) => {
  const { photos, loading, uploadPhoto, addPhotoFromUrl, removePhoto, setMainPhoto } = useUserPhotos(userId);
  const [showSocialOptions, setShowSocialOptions] = useState<number | null>(null);
  const [socialUrl, setSocialUrl] = useState('');
  const [uploading, setUploading] = useState<number | null>(null);

  console.log('PhotoGallery - userId:', userId);
  console.log('PhotoGallery - photos:', photos);

  const handleFileUpload = async (slot: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;

    console.log('File selected for upload:', file.name, 'to slot:', slot);

    setUploading(slot);
    const result = await uploadPhoto(file, slot);
    setUploading(null);
    
    // Reset the input value
    event.target.value = '';
    
    console.log('Upload result:', result);
  };

  const triggerFileInput = (slot: number) => {
    const fileInput = document.getElementById(`file-input-${slot}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleSocialUpload = async (slot: number) => {
    if (socialUrl.trim()) {
      try {
        new URL(socialUrl);
        await addPhotoFromUrl(socialUrl, slot);
        setSocialUrl('');
        setShowSocialOptions(null);
      } catch {
        alert('Please enter a valid URL');
      }
    }
  };

  const mainPhoto = photos.find(photo => photo.is_main && photo.photo_url) || 
                   photos.find(photo => photo.photo_url);
  
  // For matched users, only show photos that exist
  const otherPhotos = isMatchedUser 
    ? photos.filter(photo => !photo.is_main && photo.photo_url)
    : photos.filter(photo => !photo.is_main || !photo.photo_url);

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
      
      {/* Hidden file inputs for each photo slot - Updated to support more image formats */}
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
      
      {/* Main Photo */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-600">Main Profile Photo</span>
        </div>
        {mainPhoto?.photo_url ? (
          <div 
            className="relative w-32 h-32 bg-gray-100 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-rose-300 transition-colors"
            onClick={() => {
              if (onPhotoClick) {
                const photoIndex = photos.findIndex(p => p.photo_url === mainPhoto.photo_url);
                if (photoIndex !== -1) onPhotoClick(photoIndex);
              }
            }}
          >
            <img 
              src={mainPhoto.photo_url} 
              alt="Main profile" 
              className={`w-full h-full object-cover rounded-lg ${!canViewPhotos ? 'filter blur-md' : ''}`}
              onError={(e) => {
                console.error('Error loading image:', mainPhoto.photo_url);
              }}
            />
            {!isMatchedUser && (
              <Button
                size="sm"
                variant="outline"
                className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500 z-20 group-hover:ring-2 group-hover:ring-red-300 group-hover:shadow-lg transition-all duration-200"
                onClick={() => removePhoto(mainPhoto.photo_slot)}
                disabled={uploading === mainPhoto.photo_slot}
              >
                ×
              </Button>
            )}
          </div>
        ) : !isMatchedUser ? (
          <div className="relative w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-rose-300 transition-colors group">
            <div className="w-full h-full flex items-center justify-center">
              {uploading === (mainPhoto?.photo_slot || 1) ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500 mx-auto mb-1"></div>
                  <span className="text-xs text-gray-500">Uploading...</span>
                </div>
              ) : (
                <div className="text-center">
                  <Plus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">Add Main Photo</span>
                </div>
              )}
            </div>
            
            {/* Upload options for main photo */}
            {!uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-white hover:bg-gray-100 text-black border-gray-300"
                    onClick={() => triggerFileInput(mainPhoto?.photo_slot || 1)}
                    disabled={uploading === (mainPhoto?.photo_slot || 1)}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Upload
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-white hover:bg-gray-100 text-black border-gray-300"
                    onClick={() => setShowSocialOptions(mainPhoto?.photo_slot || 1)}
                  >
                    <Link className="w-3 h-3 mr-1" />
                    URL
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
        
        {/* Social URL input for main photo */}
        {!isMatchedUser && showSocialOptions === (mainPhoto?.photo_slot || 1) && (
          <div className="mt-2 flex space-x-2">
            <Input
              placeholder="Paste image URL from social media..."
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              size="sm" 
              onClick={() => handleSocialUpload(mainPhoto?.photo_slot || 1)}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Add
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowSocialOptions(null)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Other Photos */}
      {otherPhotos.length > 0 && (
        <div>
          <span className="text-sm font-medium text-gray-600 block mb-2">
            {isMatchedUser ? "Additional Photos" : "Additional Photos (up to 5)"}
          </span>
          <div className="grid grid-cols-3 gap-3">
            {otherPhotos.map((photo) => (
              <div key={photo.photo_slot} className="relative">
                {photo.photo_url ? (
                  <div 
                    className={`relative w-20 h-20 bg-gray-100 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-rose-300 transition-colors ${!isMatchedUser ? 'group' : ''}`}
                    onClick={() => {
                      if (onPhotoClick) {
                        const photoIndex = photos.findIndex(p => p.photo_url === photo.photo_url);
                        if (photoIndex !== -1) onPhotoClick(photoIndex);
                      }
                    }}
                  >
                    <img 
                      src={photo.photo_url} 
                      alt={`Photo ${photo.photo_slot}`} 
                      className={`w-full h-full object-cover rounded-lg ${!canViewPhotos ? 'filter blur-md' : ''}`}
                      onError={(e) => {
                        console.error('Error loading image:', photo.photo_url);
                      }}
                    />
                    {!isMatchedUser && (
                      <>
                        {/* Fixed positioning: Star button moved to top-left to avoid overlap */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute -top-2 -left-2 w-6 h-6 p-0 bg-white border-yellow-300 hover:bg-yellow-50 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMainPhoto(photo.photo_slot);
                          }}
                          disabled={uploading === photo.photo_slot}
                          title="Set as main photo"
                        >
                          <Star className="w-3 h-3 text-yellow-500" />
                        </Button>
                        {/* Delete button stays at bottom-right */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute -bottom-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(photo.photo_slot);
                          }}
                          disabled={uploading === photo.photo_slot}
                          title="Remove photo"
                        >
                          ×
                        </Button>
                      </>
                    )}
                    
                    {/* Upload options overlay - only for own profile */}
                    {!isMatchedUser && !uploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <div className="flex flex-col space-y-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-white hover:bg-gray-100 text-black border-gray-300 text-xs px-2"
                            onClick={() => triggerFileInput(photo.photo_slot)}
                            disabled={uploading === photo.photo_slot}
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
                ) : !isMatchedUser ? (
                  <div className="relative w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-rose-300 transition-colors group">
                    <div className="w-full h-full flex items-center justify-center">
                      {uploading === photo.photo_slot ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-500"></div>
                      ) : (
                        <Plus className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Upload options overlay - adjusted positioning to avoid star button */}
                    {!uploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <div className="flex flex-col space-y-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-white hover:bg-gray-100 text-black border-gray-300 text-xs px-2"
                            onClick={() => triggerFileInput(photo.photo_slot)}
                            disabled={uploading === photo.photo_slot}
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
                ) : null}
                
                {/* Social URL input for additional photos */}
                {!isMatchedUser && showSocialOptions === photo.photo_slot && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white p-2 rounded-lg shadow-lg border">
                    <div className="flex flex-col space-y-2">
                      <Input
                        placeholder="Image URL..."
                        value={socialUrl}
                        onChange={(e) => setSocialUrl(e.target.value)}
                        className="text-xs"
                        size={10}
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
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default PhotoGallery;
