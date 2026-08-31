import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  shape?: 'list-item' | 'card' | 'avatar-text' | 'message';
  rows?: number;
  label?: string;
  className?: string;
}

const SpinnerState = ({ label, className }: { label?: string; className?: string }) => (
  <div className={cn('text-center py-8', className)}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
    {label && <p className="mt-2 text-muted-foreground">{label}</p>}
  </div>
);

const ListItemSkeleton = () => (
  <div className="flex items-center space-x-3 p-4 rounded-lg border border-border">
    <Skeleton className="h-12 w-12 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

const CardSkeleton = () => (
  <div className="p-4 space-y-3 rounded-lg border border-border">
    <div className="flex items-center space-x-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

const AvatarTextSkeleton = () => (
  <div className="text-center space-y-4">
    <Skeleton className="mx-auto w-24 h-24 rounded-full" />
    <Skeleton className="mx-auto h-6 w-32" />
    <Skeleton className="mx-auto h-4 w-48" />
  </div>
);

const MessageSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-2/3 rounded-xl rounded-bl-sm" />
    <Skeleton className="h-10 w-1/2 rounded-xl rounded-br-sm ml-auto" />
    <Skeleton className="h-10 w-3/5 rounded-xl rounded-bl-sm" />
  </div>
);

const SKELETON_SHAPES = {
  'list-item': ListItemSkeleton,
  card: CardSkeleton,
  'avatar-text': AvatarTextSkeleton,
  message: MessageSkeleton,
};

const LoadingState = ({ variant = 'spinner', shape = 'list-item', rows = 3, label, className }: LoadingStateProps) => {
  if (variant === 'spinner') {
    return <SpinnerState label={label} className={className} />;
  }

  if (shape === 'avatar-text' || shape === 'message') {
    const ShapeComponent = SKELETON_SHAPES[shape];
    return (
      <div className={className}>
        <ShapeComponent />
      </div>
    );
  }

  const ShapeComponent = SKELETON_SHAPES[shape];
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <ShapeComponent key={i} />
      ))}
    </div>
  );
};

export default LoadingState;
