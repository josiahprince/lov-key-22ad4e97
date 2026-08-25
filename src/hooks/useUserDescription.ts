
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLogger';

export const useUserDescription = (userId: string | undefined) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDescription = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      
      const { data, error } = await supabase
        .from('user_descriptions')
        .select('id, description')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load description",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        setDescription(data.description || '');
        setExistingRecordId(data.id);
      } else {
        setDescription('');
        setExistingRecordId(null);
      }
    } catch (error) {
      logError(`useUserDescription:fetchDescription:${userId}`, error);
    } finally {
      setLoading(false);
    }
  };

  const saveDescription = async (newDescription: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Please sign in to save description",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      let result;
      
      if (existingRecordId) {
        // Update existing record
        result = await supabase
          .from('user_descriptions')
          .update({
            description: newDescription,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecordId)
          .select()
          .single();
      } else {
        // Insert new record
        result = await supabase
          .from('user_descriptions')
          .insert({
            user_id: userId,
            description: newDescription
          })
          .select()
          .single();
      }

      const { data, error } = result;

      if (error) {
        throw error;
      }

      setDescription(newDescription);
      
      // Update the existing record ID if we just created a new record
      if (!existingRecordId && data) {
        setExistingRecordId(data.id);
      }
      
      toast({
        title: "Success",
        description: "Description saved"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save description",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchDescription();
  }, [userId]);

  return {
    description,
    loading,
    saving,
    saveDescription,
    refetch: fetchDescription
  };
};
