
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save } from 'lucide-react';

interface DescriptionSectionProps {
  initialDescription?: string;
  onSave: (description: string) => void;
}

const DescriptionSection = ({ initialDescription = "Tell others about yourself...", onSave }: DescriptionSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(initialDescription);

  const handleSave = () => {
    setIsEditing(false);
    onSave(description);
    console.log('Description saved:', description);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-700">Description</h3>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        )}
      </div>
      
      {isEditing ? (
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
      
      {isEditing && (
        <p className="text-xs text-gray-500">{description.length}/500 characters</p>
      )}
    </Card>
  );
};

export default DescriptionSection;
