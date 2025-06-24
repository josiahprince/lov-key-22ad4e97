
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type GenderType = Database['public']['Enums']['gender_type'];
type OrientationType = Database['public']['Enums']['orientation_type'];
type InterestedInType = Database['public']['Enums']['interested_in_type'];

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
}

const ProfileEditModal = ({ isOpen, onClose, userProfile }: ProfileEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    first_name: userProfile?.first_name || '',
    last_name: userProfile?.last_name || '',
    nickname: userProfile?.nickname || '',
    age: userProfile?.age?.toString() || '',
    gender: userProfile?.gender || '',
    sexual_orientation: userProfile?.sexual_orientation || '',
    interested_in: userProfile?.interested_in || '',
    location: userProfile?.location || '',
    religion: userProfile?.religion || '',
    languages: userProfile?.languages?.join(', ') || '',
    interests: userProfile?.interests?.join(', ') || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const profileData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        nickname: formData.nickname,
        age: parseInt(formData.age) || null,
        gender: formData.gender as GenderType,
        sexual_orientation: formData.sexual_orientation as OrientationType,
        interested_in: formData.interested_in as InterestedInType,
        location: formData.location,
        religion: formData.religion,
        languages: formData.languages.split(',').map(lang => lang.trim()).filter(lang => lang),
        interests: formData.interests.split(',').map(interest => interest.trim()).filter(interest => interest),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });

      onClose();
      window.location.reload(); // Refresh to show updated data
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              min="18"
              max="100"
              required
            />
          </div>

          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non_binary">Non-binary</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sexual_orientation">Sexual Orientation</Label>
            <Select value={formData.sexual_orientation} onValueChange={(value) => handleInputChange('sexual_orientation', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="straight">Straight</SelectItem>
                <SelectItem value="gay">Gay</SelectItem>
                <SelectItem value="lesbian">Lesbian</SelectItem>
                <SelectItem value="bisexual">Bisexual</SelectItem>
                <SelectItem value="pansexual">Pansexual</SelectItem>
                <SelectItem value="asexual">Asexual</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="interested_in">Interested In</Label>
            <Select value={formData.interested_in} onValueChange={(value) => handleInputChange('interested_in', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select what you're looking for" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="men">Men</SelectItem>
                <SelectItem value="women">Women</SelectItem>
                <SelectItem value="everyone">Everyone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="City, State"
              required
            />
          </div>

          <div>
            <Label htmlFor="religion">Religion</Label>
            <Input
              id="religion"
              value={formData.religion}
              onChange={(e) => handleInputChange('religion', e.target.value)}
              placeholder="Your religion or beliefs"
            />
          </div>

          <div>
            <Label htmlFor="languages">Languages (comma-separated)</Label>
            <Input
              id="languages"
              value={formData.languages}
              onChange={(e) => handleInputChange('languages', e.target.value)}
              placeholder="English, Spanish, French"
            />
          </div>

          <div>
            <Label htmlFor="interests">Interests & Hobbies (comma-separated)</Label>
            <Textarea
              id="interests"
              value={formData.interests}
              onChange={(e) => handleInputChange('interests', e.target.value)}
              placeholder="Photography, Hiking, Cooking, Music"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditModal;
