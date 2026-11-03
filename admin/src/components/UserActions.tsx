import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { adminAction, supabase } from '../supabase';
import { useStaff } from '../useStaff';
import { ReasonDialog } from './ReasonDialog';

type Pending = 'warn' | 'suspend' | 'ban' | null;

// Warn, suspend or ban one person. Used on the user page and next to a report.
export const UserActions = ({ userId, nickname, isStaff }: { userId: string; nickname: string; isStaff: boolean }) => {
  const { can } = useStaff();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Pending>(null);

  const done = (message: string) => {
    toast.success(message);
    void queryClient.invalidateQueries();
  };

  if (isStaff) {
    return <p className="text-sm text-muted-foreground">This is a staff account. Remove their role before acting on it.</p>;
  }
  if (!can('users.warn') && !can('users.suspend') && !can('users.ban')) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {can('users.warn') && (
        <Button variant="outline" size="sm" onClick={() => setPending('warn')}>
          <AlertTriangle className="h-4 w-4 mr-1" /> Warn
        </Button>
      )}
      {can('users.suspend') && (
        <Button variant="outline" size="sm" onClick={() => setPending('suspend')}>
          <Clock className="h-4 w-4 mr-1" /> Suspend
        </Button>
      )}
      {can('users.ban') && (
        <Button variant="destructive" size="sm" onClick={() => setPending('ban')}>
          <Ban className="h-4 w-4 mr-1" /> Ban
        </Button>
      )}

      <ReasonDialog
        open={pending === 'warn'}
        onOpenChange={(open) => !open && setPending(null)}
        title={`Warn ${nickname}`}
        description="They get a notification in the app with exactly this message. Nothing else changes."
        reasonLabel="Message to them (also goes in the audit log)"
        reasonPlaceholder="e.g. Please keep conversations respectful. Repeated insults will lead to a suspension."
        confirmLabel="Send warning"
        onConfirm={async (reason) => {
          const { error } = await supabase.rpc('admin_warn_user', { p_user_id: userId, p_reason: reason });
          if (error) throw error;
          done(`${nickname} was warned`);
        }}
      />
      <ReasonDialog
        open={pending === 'suspend'}
        onOpenChange={(open) => !open && setPending(null)}
        title={`Suspend ${nickname}`}
        description="They can't sign in until the date you pick, aren't matched, and their open matches and chats close for the other person (who isn't told why). Closed chats stay closed."
        confirmLabel="Suspend"
        destructive
        withEndDate
        onConfirm={async (reason, endsAt) => {
          await adminAction({ action: 'restrict', userId, kind: 'suspension', endsAt, reason });
          done(`${nickname} is suspended`);
        }}
      />
      <ReasonDialog
        open={pending === 'ban'}
        onOpenChange={(open) => !open && setPending(null)}
        title={`Ban ${nickname}`}
        description="Permanent: they can't sign in or be matched, and their open matches and chats close for the other person (who isn't told why). You can lift it later from their page."
        confirmLabel="Ban"
        destructive
        onConfirm={async (reason) => {
          await adminAction({ action: 'restrict', userId, kind: 'ban', reason });
          done(`${nickname} is banned`);
        }}
      />
    </div>
  );
};
