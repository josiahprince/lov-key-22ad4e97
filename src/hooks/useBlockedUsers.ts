import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { logError } from '@/lib/errorLogger';

export interface BlockedUser {
  blockedId: string;
  nickname: string | null;
  blockedAt: string;
}

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBlockedUsers = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_blocked_users');
      if (error) throw error;
      setBlockedUsers(
        (data || []).map((row) => ({
          blockedId: row.blocked_id,
          nickname: row.nickname,
          blockedAt: row.blocked_at,
        }))
      );
    } catch (error) {
      logError('useBlockedUsers:fetchBlockedUsers', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const unblockUser = async (targetUserId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('unblock_user', { target_user_id: targetUserId });
      if (error) throw error;
      setBlockedUsers((prev) => prev.filter((u) => u.blockedId !== targetUserId));
      toast({ title: 'User unblocked' });
      return true;
    } catch (error) {
      logError('useBlockedUsers:unblockUser', error);
      toast({
        title: 'Error',
        description: 'Failed to unblock user. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { blockedUsers, loading, unblockUser, refetch: fetchBlockedUsers };
};
