import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLogger';

const CONFIRM_WORD = 'DELETE';

const DeleteAccountDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });

    if (error) {
      logError('DeleteAccountDialog:delete', error);
      setDeleting(false);
      toast({
        title: 'Could not delete your account',
        description: 'Please try again. If it keeps failing, contact support.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Account deleted', description: 'Your LovKey account and data have been removed.' });
    // The auth user no longer exists, so only clear the local session.
    // AppLayout then falls back to the sign-in screen.
    await supabase.auth.signOut({ scope: 'local' });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!deleting) { setOpen(next); setConfirmText(''); } }}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive border-destructive/30">
          <Trash2 className="h-4 w-4" />
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                This permanently deletes your profile, photos, matches, and every chat you are part of. Your matches
                will no longer see you. This can't be undone.
              </p>
              <p>
                Safety reports you filed, or that were filed about you, are kept for safety and legal reasons.
              </p>
              <p>
                Type <span className="font-semibold text-foreground">{CONFIRM_WORD}</span> to confirm.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={CONFIRM_WORD}
          aria-label={`Type ${CONFIRM_WORD} to confirm`}
          autoComplete="off"
          disabled={deleting}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction, so the dialog stays open while the request runs. */}
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== CONFIRM_WORD || deleting}
          >
            {deleting ? 'Deleting...' : 'Delete forever'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountDialog;
