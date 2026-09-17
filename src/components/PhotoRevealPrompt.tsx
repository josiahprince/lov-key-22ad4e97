import { Eye, Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PHOTO_REVEAL_ROUND_EXTENSION, type PhotoRevealChoice } from '@/lib/constants';

interface PhotoRevealPromptProps {
  matchedUserName: string;
  threshold: number;
  waitingForPartner: boolean;
  submitting: boolean;
  onChoose: (choice: PhotoRevealChoice) => void;
  className?: string;
}

const PhotoRevealPrompt = ({
  matchedUserName,
  threshold,
  waitingForPartner,
  submitting,
  onChoose,
  className,
}: PhotoRevealPromptProps) => {
  if (waitingForPartner) {
    return (
      <Card className={cn('p-3 bg-accent border-primary/20', className)}>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
          <p className="text-xs text-accent-foreground">
            Waiting for {matchedUserName} to decide. Photos unlock as soon as you both agree.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-3 bg-accent border-primary/20 space-y-3', className)}>
      <div className="flex items-start gap-2">
        <Eye className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-accent-foreground">Ready to see each other?</p>
          <p className="text-xs text-accent-foreground/80">
            You've exchanged {threshold} messages. Photos are revealed only if you both choose to.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={() => onChoose('reveal')} disabled={submitting} className="w-full rounded-xl">
          <Eye className="w-4 h-4 mr-2" />
          View Photos
        </Button>
        <Button
          onClick={() => onChoose('wait')}
          disabled={submitting}
          variant="outline"
          className="w-full rounded-xl border-primary/20 text-primary hover:bg-accent"
        >
          <Clock className="w-4 h-4 mr-2" />
          Wait for another {PHOTO_REVEAL_ROUND_EXTENSION} messages
        </Button>
      </div>
    </Card>
  );
};

export default PhotoRevealPrompt;
