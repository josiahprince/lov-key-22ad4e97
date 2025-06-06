
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Star, Upload, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Photo {
  id: number;
  url: string;
  isMain: boolean;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
}

const PhotoGallery = ({ photos, onPhotosChange }: PhotoGalleryProps) => {
  const [showSocialOptions, setShowSocialOptions] = useState<number | null>(null);
  const [socialUrl, setSocialUrl] = useState('');
  const [uploading, setUploading] = useState<number | null>(null);

  const uploadToSupabase = async (file: File, photoId: number) => {
    try {
      setUploading(photoId);
      console.log('Starting upload for photo slot:', photoId);
      
      // For demo purposes, we'll create a mock user ID
      // In a real app, you'd get this from authentication
      const mockUserId = 'demo-user-123';
      
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${mockUserId}/${photoId}-${Date.now()}.${fileExt}`;

      console.log('Uploading file:', fileName);

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
        return;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      // Update photos array
      const updatedPhotos = photos.map(photo => 
        photo.id === photoId ? { ...photo, url: publicUrl } : photo
      );
      onPhotosChange(updatedPhotos);

      console.log('Photo uploaded successfully for slot:', photoId);
      alert('Photo uploaded successfully!');
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Unexpected error occurred. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleFileUpload = async (photoId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File upload triggered for photo slot:', photoId);
    const file = event.target.files?.[0];
    
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

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

    await uploadToSupabase(file, photoId);
    
    // Reset the input value to allow uploading the same file again
    event.target.value = '';
  };

  const triggerFileInput = (photoId: number) => {
    console.log('Triggering file input for photo:', photoId);
    const fileInput = document.getElementById(`file-input-${photoId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    } else {
      console.error('File input not found for photo:', photoId);
    }
  };

  const handleSocialUpload = (photoId: number) => {
    if (socialUrl.trim()) {
      // Basic URL validation
      try {
        new URL(socialUrl);
        const updatedPhotos = photos.map(photo => 
          photo.id === photoId ? { ...photo, url: socialUrl } : photo
        );
        onPhotosChange(updatedPhotos);
        setSocialUrl('');
        setShowSocialOptions(null);
        console.log('Social media photo added for slot:', photoId);
      } catch {
        alert('Please enter a valid URL');
      }
    }
  };

  const setMainPhoto = (photoId: number) => {
    const updatedPhotos = photos.map(photo => ({
      ...photo,
      isMain: photo.id === photoId
    }));
    onPhotosChange(updatedPhotos);
    console.log('Main photo set to slot:', photoId);
  };

  const removePhoto = async (photoId: number) => {
    const photoToRemove = photos.find(photo => photo.id === photoId);
    
    // If it's a Supabase-hosted photo, attempt to delete from storage
    if (photoToRemove?.url && photoToRemove.url.includes('supabase')) {
      try {
        const mockUserId = 'demo-user-123';
        // Extract filename from URL - this is a simplified approach
        const urlParts = photoToRemove.url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const fullPath = `${mockUserId}/${fileName}`;
        
        const { error } = await supabase.storage
          .from('profile-photos')
          .remove([fullPath]);
        
        if (error) {
          console.error('Error deleting file from storage:', error);
        } else {
          console.log('File deleted from storage successfully');
        }
      } catch (error) {
        console.error('Error during file deletion:', error);
      }
    }

    const updatedPhotos = photos.map(photo => 
      photo.id === photoId ? { ...photo, url: '' } : photo
    );
    onPhotosChange(updatedPhotos);
    console.log('Photo removed from slot:', photoId);
  };

  const mainPhoto = photos.find(photo => photo.isMain);
  const otherPhotos = photos.filter(photo => !photo.isMain);

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-medium text-gray-700">Photo Gallery</h3>
      
      {/* Hidden file inputs for each photo slot */}
      {photos.map((photo) => (
        <input
          key={photo.id}
          id={`file-input-${photo.id}`}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(photo.id, e)}
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
          {mainPhoto?.url ? (
            <>
              <img src={mainPhoto.url} alt="Main profile" className="w-full h-full object-cover rounded-lg" />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-1 right-1 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500"
                onClick={() => removePhoto(mainPhoto.id)}
                disabled={uploading === mainPhoto.id}
              >
                ×
              </Button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {uploading === (mainPhoto?.id || 1) ? (
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
                  onClick={() => triggerFileInput(mainPhoto?.id || 1)}
                  disabled={uploading === (mainPhoto?.id || 1)}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Upload
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-white hover:bg-gray-100 text-black border-gray-300"
                  onClick={() => setShowSocialOptions(mainPhoto?.id || 1)}
                >
                  <Link className="w-3 h-3 mr-1" />
                  URL
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Social URL input for main photo */}
        {showSocialOptions === (mainPhoto?.id || 1) && (
          <div className="mt-2 flex space-x-2">
            <Input
              placeholder="Paste image URL from social media..."
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              size="sm" 
              onClick={() => handleSocialUpload(mainPhoto?.id || 1)}
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
            <div key={photo.id} className="relative">
              <div className="relative w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-rose-300 transition-colors group">
                {photo.url ? (
                  <>
                    <img src={photo.url} alt={`Photo ${photo.id}`} className="w-full h-full object-cover rounded-lg" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-white border-rose-200 hover:bg-rose-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMainPhoto(photo.id);
                      }}
                      disabled={uploading === photo.id}
                    >
                      <Star className="w-3 h-3 text-yellow-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(photo.id);
                      }}
                      disabled={uploading === photo.id}
                    >
                      ×
                    </Button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {uploading === photo.id ? (
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
                        onClick={() => triggerFileInput(photo.id)}
                        disabled={uploading === photo.id}
                      >
                        <Upload className="w-2 h-2 mr-1" />
                        Upload
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-white hover:bg-gray-100 text-black border-gray-300 text-xs px-2"
                        onClick={() => setShowSocialOptions(photo.id)}
                      >
                        <Link className="w-2 h-2 mr-1" />
                        URL
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Social URL input for additional photos */}
              {showSocialOptions === photo.id && (
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
                        onClick={() => handleSocialUpload(photo.id)}
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
