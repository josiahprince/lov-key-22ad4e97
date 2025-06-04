
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Edit, Save, Heart, Plus, Star, Upload, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';

const ProfileScreen = ({ userProfile }: { userProfile: any }) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(userProfile?.description || "Tell others about yourself...");
  const [photos, setPhotos] = useState([
    { id: 1, url: '', isMain: true },
    { id: 2, url: '', isMain: false },
    { id: 3, url: '', isMain: false },
    { id: 4, url: '', isMain: false },
    { id: 5, url: '', isMain: false },
    { id: 6, url: '', isMain: false },
  ]);
  const [showSocialOptions, setShowSocialOptions] = useState<number | null>(null);
  const [socialUrl, setSocialUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!userProfile) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No profile data available</p>
      </div>
    );
  }

  const handleSaveDescription = () => {
    setIsEditingDescription(false);
    console.log('Description saved:', description);
  };

  const handleFileUpload = (photoId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotos(photos.map(photo => 
          photo.id === photoId ? { ...photo, url: result } : photo
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSocialUpload = (photoId: number) => {
    if (socialUrl.trim()) {
      setPhotos(photos.map(photo => 
        photo.id === photoId ? { ...photo, url: socialUrl } : photo
      ));
      setSocialUrl('');
      setShowSocialOptions(null);
    }
  };

  const setMainPhoto = (photoId: number) => {
    setPhotos(photos.map(photo => ({
      ...photo,
      isMain: photo.id === photoId
    })));
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    
    // Simulate API call
    try {
      console.log('Updating profile with:', {
        description,
        photos: photos.filter(photo => photo.url),
        userProfile
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const mainPhoto = photos.find(photo => photo.isMain);
  const otherPhotos = photos.filter(photo => !photo.isMain);

  return (
    <div className="p-6 space-y-6 pb-20">
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-24 h-24">
          <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            {mainPhoto?.url ? (
              <img src={mainPhoto.url} alt="Profile" className="w-full h-full object-cover rounded-full" />
            ) : (
              <Camera className="w-8 h-8 text-rose-400" />
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
            <Edit className="w-4 h-4 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Your Profile</h1>
          <p className="text-gray-600">This is how others see you</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-700">Current Mood</h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-gray-600 capitalize">{userProfile.mood}</span>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Today's Vibe</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-lg">📚</span>
              <span className="text-gray-600">Book Worm</span>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">About You</h3>
            <p className="text-gray-600 text-sm mt-1 leading-relaxed">
              {userProfile.promptAnswer}
            </p>
          </div>
        </div>
      </Card>

      {/* Description Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700">Description</h3>
          {!isEditingDescription ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingDescription(true)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSaveDescription}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          )}
        </div>
        
        {isEditingDescription ? (
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell others about yourself..."
            className="min-h-[100px] resize-none"
            maxLength={500}
          />
        ) : (
          <p className="text-gray-600 text-sm leading-relaxed">
            {description}
          </p>
        )}
        
        {isEditingDescription && (
          <p className="text-xs text-gray-500">{description.length}/500 characters</p>
        )}
      </Card>

      {/* Photo Gallery Section */}
      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-gray-700">Photo Gallery</h3>
        
        {/* Main Photo */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-600">Main Profile Photo</span>
          </div>
          <div className="relative w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-rose-300 transition-colors">
            {mainPhoto?.url ? (
              <img src={mainPhoto.url} alt="Main profile" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Plus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">Add Main Photo</span>
                </div>
              </div>
            )}
            
            {/* Upload options for main photo */}
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <div className="flex space-x-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(mainPhoto?.id || 1, e)}
                    className="hidden"
                  />
                  <Button size="sm" variant="outline" className="bg-white hover:bg-gray-100">
                    <Upload className="w-3 h-3 mr-1" />
                    Upload
                  </Button>
                </label>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-white hover:bg-gray-100"
                  onClick={() => setShowSocialOptions(mainPhoto?.id || 1)}
                >
                  <Link className="w-3 h-3 mr-1" />
                  URL
                </Button>
              </div>
            </div>
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
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-rose-300 transition-colors">
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
                      >
                        <Star className="w-3 h-3 text-yellow-500" />
                      </Button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Upload options overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <div className="flex flex-col space-y-1">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(photo.id, e)}
                          className="hidden"
                        />
                        <Button size="sm" variant="outline" className="bg-white hover:bg-gray-100 text-xs px-2">
                          <Upload className="w-2 h-2 mr-1" />
                          Upload
                        </Button>
                      </label>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-white hover:bg-gray-100 text-xs px-2"
                        onClick={() => setShowSocialOptions(photo.id)}
                      >
                        <Link className="w-2 h-2 mr-1" />
                        URL
                      </Button>
                    </div>
                  </div>
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

      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center space-x-3">
          <Camera className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-800">Photo Privacy</h4>
            <p className="text-sm text-blue-600">
              Your main photo stays blurred until both people exchange 30 messages
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
        <div className="text-center space-y-2">
          <Heart className="w-6 h-6 mx-auto text-rose-500" />
          <h4 className="font-medium text-rose-800">Privacy First</h4>
          <p className="text-sm text-rose-600">
            Additional photos are revealed only when your match requests to see them after 30 messages
          </p>
        </div>
      </Card>

      <Button 
        className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl disabled:opacity-50"
        onClick={handleUpdateProfile}
        disabled={isUpdating}
      >
        {isUpdating ? 'Updating...' : 'Update Profile'}
      </Button>
    </div>
  );
};

export default ProfileScreen;
