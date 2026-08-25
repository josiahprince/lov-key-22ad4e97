import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';

interface MatchedUserDescriptionSectionProps {
  userId: string;
}

const MatchedUserDescriptionSection = ({ userId }: MatchedUserDescriptionSectionProps) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceIdRef = useRef<string>(Math.random().toString(36).substring(7));

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
          logError(`MatchedUserDescriptionSection:fetch:${userId}`, error);
        } else {
          setDescription(data?.description || '');
        }
      } catch (error) {
        logError(`MatchedUserDescriptionSection:fetchDescription:${userId}`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchDescription();

    // Subscribe to real-time updates
    if (!userId) return;

    // Clean up existing subscription before creating new one
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channelName = `matched-desc-${userId}-${instanceIdRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_descriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setDescription('');
          } else {
            setDescription((payload.new as { description?: string })?.description || '');
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
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
