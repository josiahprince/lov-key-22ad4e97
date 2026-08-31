import { cn } from '@/lib/utils';

interface InitialsAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  imgClassName?: string;
  blurred?: boolean;
}

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

const InitialsAvatar = ({ src, name, className, imgClassName, blurred }: InitialsAvatarProps) => {
  if (src) {
    return (
      <div className={cn('w-full h-full rounded-full overflow-hidden bg-accent', className)}>
        <img
          src={src}
          alt={name}
          className={cn('w-full h-full object-cover', blurred && 'filter blur-sm', imgClassName)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full h-full rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium',
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};

export default InitialsAvatar;
