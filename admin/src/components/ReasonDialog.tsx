import { useEffect, useState } from 'react';
import { addDays, endOfDay, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '../errors';

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  destructive?: boolean;
  // Suspensions ask for an end date (the end of that day, local time).
  withEndDate?: boolean;
  onConfirm: (reason: string, endsAt?: string) => Promise<void>;
}

// Every staff action needs a written reason; this collects it.
export const ReasonDialog = ({
  open, onOpenChange, title, description, confirmLabel, reasonLabel = 'Reason (goes in the audit log)',
  reasonPlaceholder, destructive, withEndDate, onConfirm,
}: ReasonDialogProps) => {
  const [reason, setReason] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setEndDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
      setError('');
    }
  }, [open]);

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      const endsAt = withEndDate && endDate ? endOfDay(new Date(`${endDate}T00:00`)).toISOString() : undefined;
      await onConfirm(reason.trim(), endsAt);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {withEndDate && (
            <div className="space-y-2">
              <Label htmlFor="ends">Suspended until the end of</Label>
              <Input
                id="ends"
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reason">{reasonLabel}</Label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              placeholder={reasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={saving || !reason.trim() || (withEndDate && !endDate)}
          >
            {saving ? 'Saving…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
