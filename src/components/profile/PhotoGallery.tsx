import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Star, Upload, Link } from 'lucide-react';
import { useUserPhotos } from '@/hooks/useUserPhotos';
import { supabase } from '@/integrations/supabase/client';

interface PhotoGalleryProps {
  userId?: string;
}

const PhotoGallery = ({ userId }: PhotoGalleryProps) => {
  const { photos, loading, uploadPhoto, addPhotoFromUrl, removePhoto, setMainPhoto } = useUserPhotos(userId);
  const [showSocialOptions, setShowSocialOptions] = useState<number | null>(null);
  const [socialUrl, setSocialUrl] = useState('');
  const [uploading, setUploading] = useState<number | null>(null);

  const handleFileUpload = async (slot: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
      return;
    }

    setUploading(slot);
    await uploadPhoto(file, slot);
    setUploading(null);
    
    // Reset the input value
    event.target.value = '';
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

  const mainPhoto = photos.find(photo => photo.is_main);
  const otherPhotos = photos.filter(photo => !photo.is_main);

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
      
      {/* Hidden file inputs for each photo slot */}
      {photos.map((photo) => (
        <input
          key={photo.photo_slot}
          id={`file-input-${photo.photo_slot}`}
          type="file"
          accept="image/*"
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
        <div className="relative w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-rose-300 transition-colors group">
          {mainPhoto?.photo_url ? (
            <>
              <img src={mainPhoto.photo_url} alt="Main profile" className="w-full h-full object-cover rounded-lg" />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500"
                onClick={() => removePhoto(mainPhoto.photo_slot)}
                disabled={uploading === mainPhoto.photo_slot}
              >
                ×
              </Button>
            </>
          ) : (
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
          )}
          
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
        
        {/* Social URL input for main photo */}
        {showSocialOptions === (mainPhoto?.photo_slot || 1) && (
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
      <div>
        <span className="text-sm font-medium text-gray-600 block mb-2">Additional Photos (up to 5)</span>
        <div className="grid grid-cols-3 gap-3">
          {otherPhotos.map((photo) => (
            <div key={photo.photo_slot} className="relative">
              <div className="relative w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-rose-300 transition-colors group">
                {photo.photo_url ? (
                  <>
                    <img src={photo.photo_url} alt={`Photo ${photo.photo_slot}`} className="w-full h-full object-cover rounded-lg" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-white border-rose-200 hover:bg-rose-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMainPhoto(photo.photo_slot);
                      }}
                      disabled={uploading === photo.photo_slot}
                    >
                      <Star className="w-3 h-3 text-yellow-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(photo.photo_slot);
                      }}
                      disabled={uploading === photo.photo_slot}
                    >
                      ×
                    </Button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {uploading === photo.photo_slot ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-500"></div>
                    ) : (
                      <Plus className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                )}
                
                {/* Upload options overlay */}
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
              
              {/* Social URL input for additional photos */}
              {showSocialOptions === photo.photo_slot && (
                <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-white p-2 rounded-lg shadow-lg border">
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
    </Card>
  );
};

export default PhotoGallery;
