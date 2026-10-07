
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useUserDescription } from '@/hooks/useUserDescription';
import { useAuth } from '@/hooks/useAuth';

interface DescriptionSectionProps {
  onSave?: (description: string) => void;
}

const DescriptionSection = ({ onSave }: DescriptionSectionProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [localDescription, setLocalDescription] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const { description, loading, saving, saveDescription } = useUserDescription(currentUserId);

  useEffect(() => {
    setLocalDescription(description);
  }, [description]);

  const handleDescriptionChange = (newDescription: string) => {
    setLocalDescription(newDescription);
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout to save after 1 second of no typing
    const timeout = setTimeout(() => {
      saveDescription(newDescription);
      if (onSave) {
        onSave(newDescription);
      }
    }, 1000);
    
    setSaveTimeout(timeout);
  };

  // Clear timeout on component unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  if (loading) {
    return (
      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-foreground">Description</h3>
        <div className="animate-pulse">
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Description</h3>
        {saving && (
          <span className="text-xs text-muted-foreground">Saving...</span>
        )}
      </div>
      
      <Textarea
        value={localDescription}
        onChange={(e) => handleDescriptionChange(e.target.value)}
        placeholder="Tell others about yourself..."
        className="min-h-[100px] resize-none"
        maxLength={500}
      />
      
      <p className="text-xs text-muted-foreground">{localDescription.length}/500 characters</p>
    </Card>
  );
};

export default DescriptionSection;
