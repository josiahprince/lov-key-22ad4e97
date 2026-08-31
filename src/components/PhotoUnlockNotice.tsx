import { Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getPhotoUnlockCopy, PHOTO_UNLOCK_THRESHOLD } from '@/lib/constants';

interface PhotoUnlockNoticeProps {
  current: number;
  total?: number;
  variant?: 'banner' | 'card';
  className?: string;
}

const PhotoUnlockNotice = ({ current, total = PHOTO_UNLOCK_THRESHOLD, variant = 'banner', className }: PhotoUnlockNoticeProps) => {
  const copy = getPhotoUnlockCopy(current, total);

  if (variant === 'card') {
    return (
      <Card className={cn('p-4 bg-accent border-primary/20 text-center space-y-1', className)}>
        <Eye className="w-5 h-5 mx-auto text-primary" />
        <p className="text-sm text-accent-foreground">{copy.description}</p>
        <p className="text-xs text-accent-foreground/80">{copy.progress}</p>
      </Card>
    );
  }

  return (
    <div className={cn('p-2 bg-accent rounded-lg', className)}>
      <p className="text-xs text-accent-foreground">
        <Eye className="w-3 h-3 inline mr-1" />
        {copy.description} Current: {copy.progress}
      </p>
    </div>
  );
};

export default PhotoUnlockNotice;
