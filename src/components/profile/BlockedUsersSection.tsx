import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

const BlockedUsersSection = () => {
  const { blockedUsers, loading, unblockUser } = useBlockedUsers();
  const [pendingUnblockId, setPendingUnblockId] = useState<string | null>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <UserX className="h-4 w-4" />
          Blocked Users
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Blocked Users</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && blockedUsers.length === 0 && (
            <p className="text-sm text-muted-foreground">You haven't blocked anyone.</p>
          )}
          {blockedUsers.map((u) => (
            <div key={u.blockedId} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{u.nickname || 'Unknown user'}</p>
                <p className="text-xs text-muted-foreground">
                  Blocked {formatDistanceToNow(new Date(u.blockedAt), { addSuffix: true })}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPendingUnblockId(u.blockedId)}>
                Unblock
              </Button>
            </div>
          ))}
        </div>

        <AlertDialog open={!!pendingUnblockId} onOpenChange={(open) => !open && setPendingUnblockId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unblock this user?</AlertDialogTitle>
              <AlertDialogDescription>
                They'll be eligible to be matched with you again in the future.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingUnblockId) unblockUser(pendingUnblockId);
                  setPendingUnblockId(null);
                }}
              >
                Unblock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
};

export default BlockedUsersSection;
