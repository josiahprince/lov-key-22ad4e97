import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface MatchedUserDescriptionSectionProps {
  userId: string;
}

const MatchedUserDescriptionSection = ({ userId }: MatchedUserDescriptionSectionProps) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDescription = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('user_descriptions')
          .select('description')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching description:', error);
        } else {
          setDescription(data?.description || '');
        }
      } catch (error) {
        console.error('Unexpected error fetching description:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDescription();
  }, [userId]);

  if (loading) {
    return (
      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-gray-700">Description</h3>
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-medium text-gray-700">Description</h3>
      
      {description ? (
        <div className="p-3 bg-gray-50 rounded-lg border">
          <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 rounded-lg border">
          <p className="text-gray-500 italic">No description available</p>
        </div>
      )}
    </Card>
  );
};

export default MatchedUserDescriptionSection;