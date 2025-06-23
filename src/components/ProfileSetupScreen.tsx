
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const INTERESTS_OPTIONS = [
  'Music', 'Travel', 'Memes', 'Pets', 'Sports', 'Reading', 'Movies', 'Gaming',
  'Cooking', 'Art', 'Photography', 'Dancing', 'Fitness', 'Technology', 'Nature',
  'Fashion', 'Food', 'Adventure', 'Comedy', 'Science'
];

const RELIGION_OPTIONS = [
  'Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Sikhism',
  'Atheist', 'Agnostic', 'Spiritual', 'Other', 'Prefer not to say'
];

const LANGUAGES_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
  'Chinese (Mandarin)', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Dutch',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Czech', 'Hungarian'
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' }
];

const ORIENTATION_OPTIONS = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'other', label: 'Other' }
];

const INTERESTED_IN_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'everyone', label: 'Everyone' }
];

interface ProfileSetupScreenProps {
  onComplete: (profile: any) => void;
}

const ProfileSetupScreen = ({ onComplete }: ProfileSetupScreenProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    age: '',
    gender: '',
    sexual_orientation: '',
    interested_in: '',
    location: '',
    interests: [] as string[],
    religion: '',
    languages: [] as string[]
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: 'interests' | 'languages', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return formData.first_name && formData.last_name && formData.nickname && formData.age;
      case 2:
        return formData.gender && formData.sexual_orientation && formData.interested_in;
      case 3:
        return formData.location;
      case 4:
        return formData.interests.length > 0;
      case 5:
        return formData.religion;
      case 6:
        return formData.languages.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const profileData = {
        id: user.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        nickname: formData.nickname,
        age: parseInt(formData.age),
        gender: formData.gender,
        sexual_orientation: formData.sexual_orientation,
        interested_in: formData.interested_in,
        location: formData.location,
        interests: formData.interests,
        religion: formData.religion,
        languages: formData.languages,
        is_profile_complete: true
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile setup completed!"
      });

      onComplete(profileData);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">Basic Information</h2>
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
            <div>
              <Label htmlFor="nickname">Nickname *</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                placeholder="What should people call you?"
              />
            </div>
            <div>
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="18"
                max="100"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                placeholder="Enter your age"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Gender & Orientation</h2>
            <div>
              <Label>Gender *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {GENDER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={formData.gender === option.value ? "default" : "outline"}
                    onClick={() => handleInputChange('gender', option.value)}
                    className="justify-start"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Sexual Orientation *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {ORIENTATION_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={formData.sexual_orientation === option.value ? "default" : "outline"}
                    onClick={() => handleInputChange('sexual_orientation', option.value)}
                    className="justify-start text-sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Interested In *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {INTERESTED_IN_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={formData.interested_in === option.value ? "default" : "outline"}
                    onClick={() => handleInputChange('interested_in', option.value)}
                    className="justify-start"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">Location</h2>
            <div>
              <Label htmlFor="location">Where are you located? *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, State/Country"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">Interests & Hobbies</h2>
            <p className="text-center text-gray-600 mb-4">Select all that apply *</p>
            <div className="grid grid-cols-2 gap-3">
              {INTERESTS_OPTIONS.map((interest) => (
                <div key={interest} className="flex items-center space-x-2">
                  <Checkbox
                    id={interest}
                    checked={formData.interests.includes(interest)}
                    onCheckedChange={() => handleArrayToggle('interests', interest)}
                  />
                  <Label htmlFor={interest} className="text-sm">{interest}</Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">Religion & Beliefs</h2>
            <div className="grid grid-cols-2 gap-3">
              {RELIGION_OPTIONS.map((religion) => (
                <Button
                  key={religion}
                  variant={formData.religion === religion ? "default" : "outline"}
                  onClick={() => handleInputChange('religion', religion)}
                  className="justify-start text-sm"
                >
                  {religion}
                </Button>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">Languages Spoken</h2>
            <p className="text-center text-gray-600 mb-4">Select all languages you speak *</p>
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES_OPTIONS.map((language) => (
                <div key={language} className="flex items-center space-x-2">
                  <Checkbox
                    id={language}
                    checked={formData.languages.includes(language)}
                    onCheckedChange={() => handleArrayToggle('languages', language)}
                  />
                  <Label htmlFor={language} className="text-sm">{language}</Label>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-white/80 backdrop-blur-sm shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" 
              alt="LovKey Logo" 
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Complete Your Profile</h1>
          <p className="text-sm text-gray-600 mt-2">
            Step {currentStep} of 6
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div 
              className="bg-rose-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {renderStep()}

        <div className="flex justify-between mt-8">
          {currentStep > 1 && (
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 mr-2"
            >
              Back
            </Button>
          )}
          
          {currentStep < 6 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep()}
              className="flex-1 bg-rose-500 hover:bg-rose-600"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!validateStep() || loading}
              className="flex-1 bg-rose-500 hover:bg-rose-600"
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProfileSetupScreen;
