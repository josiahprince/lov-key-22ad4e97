import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLogger';

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or abusive behavior' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'spam', label: 'Spam' },
  { value: 'underage', label: 'Underage user' },
  { value: 'other', label: 'Other' },
] as const;

interface BlockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  matchId: string | null;
  onSubmitted: (blocked: boolean) => void;
}

const BlockReportModal = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  matchId,
  onSubmitted,
}: BlockReportModalProps) => {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const resetAndClose = () => {
    setReason('');
    setDetails('');
    setAlsoBlock(true);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: 'Select a reason',
        description: 'Please choose a reason for this report.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_report', {
        reported_user_id: targetUserId,
        p_match_id: matchId,
        p_reason: reason,
        p_details: details || null,
        also_block: alsoBlock,
      });
      if (error) throw error;

      toast({
        title: 'Report submitted',
        description: "We'll review it within 24 hours.",
      });
      resetAndClose();
      onSubmitted(alsoBlock);
    } catch (error) {
      logError('BlockReportModal:handleSubmit', error);
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetUserName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="report-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-details">Additional details (optional)</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything else we should know?"
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="also-block"
              checked={alsoBlock}
              onCheckedChange={(checked) => setAlsoBlock(checked === true)}
            />
            <Label htmlFor="also-block" className="font-normal">
              Also block this user
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={resetAndClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockReportModal;
