import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLogger';

export const useBlockUser = () => {
  const [blocking, setBlocking] = useState(false);
  const { toast } = useToast();

  const blockUser = async (targetUserId: string): Promise<boolean> => {
    setBlocking(true);
    try {
      const { error } = await supabase.rpc('block_user', { target_user_id: targetUserId });
      if (error) throw error;
      toast({
        title: 'User blocked',
        description: "They won't be able to contact you again.",
      });
      return true;
    } catch (error) {
      logError('useBlockUser:blockUser', error);
      toast({
        title: 'Error',
        description: 'Failed to block user. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setBlocking(false);
    }
  };

  return { blockUser, blocking };
};
